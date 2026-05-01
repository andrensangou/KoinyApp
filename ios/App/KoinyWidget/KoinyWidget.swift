//
//  KoinyWidget.swift
//  KoinyWidget
//
//  Created by Andre on 22/02/2026.
//

import WidgetKit
import SwiftUI

private let appGroupID = "group.com.koiny.app"

// MARK: - Data Model

struct KoinyWidgetData: Codable {
    var childName: String = "–"
    var balance: Double = 0
    var goalName: String? = nil
    var goalTarget: Double = 0
    var language: String = "fr"
    var lastMissionApprovedDate: String? = nil
    var pendingMissionsCount: Int = 0
    var todayEarned: Double = 0

    var progress: Double {
        guard goalTarget > 0 else { return 0 }
        return min(1.0, balance / goalTarget)
    }
    var remaining: Double { max(0, goalTarget - balance) }

    var daysSinceLastMission: Int? {
        guard let dateStr = lastMissionApprovedDate else { return nil }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = formatter.date(from: dateStr) ?? ISO8601DateFormatter().date(from: dateStr)
        guard let d = date else { return nil }
        return Calendar.current.dateComponents([.day], from: d, to: .now).day
    }

    // Returns (emoji, bigText, smallText, isWarning)
    var statusInfo: (emoji: String, big: String, small: String, isWarning: Bool)? {
        if pendingMissionsCount > 0 {
            let n = pendingMissionsCount
            let big = "\(n)"
            let small: String
            switch language {
            case "nl": small = n > 1 ? "missies wachten!" : "missie wacht!"
            case "en": small = n > 1 ? "missions waiting!" : "mission waiting!"
            default:   small = n > 1 ? "missions en attente !" : "mission en attente !"
            }
            return ("🔔", big, small, false)
        }
        if todayEarned > 0 {
            let big = String(format: "+%.2f€", todayEarned)
            let small: String
            switch language {
            case "nl": small = "verdiend vandaag 🎉"
            case "en": small = "earned today 🎉"
            default:   small = "gagné aujourd'hui 🎉"
            }
            return ("", big, small, false)
        }
        if let days = daysSinceLastMission, days > 2 {
            let big: String
            let small: String
            if days >= 14 {
                let weeks = days / 7
                big = "\(weeks)"
                switch language {
                case "nl": small = weeks > 1 ? "weken zonder missie" : "week zonder missie"
                case "en": small = weeks > 1 ? "weeks without mission" : "week without mission"
                default:   small = weeks > 1 ? "semaines sans mission" : "semaine sans mission"
                }
            } else {
                big = "\(days)"
                switch language {
                case "nl": small = "dagen zonder missie"
                case "en": small = days > 1 ? "days without mission" : "day without mission"
                default:   small = "jours sans mission"
                }
            }
            return ("😴", big, small, true)
        }
        return nil
    }

    // Localized strings
    var goalLabel: String {
        switch language {
        case "nl": return "DOEL"
        case "en": return "GOAL"
        default:   return "OBJECTIF"
        }
    }
    var remainingLabel: String {
        let value = String(format: "%.2f€", remaining)
        switch language {
        case "nl": return "\(value) resterend"
        case "en": return "\(value) remaining"
        default:   return "\(value) restant"
        }
    }
    var noGoalLabel: String {
        switch language {
        case "nl": return "Geen doel ingesteld"
        case "en": return "No goal set"
        default:   return "Aucun objectif défini"
        }
    }
    var widgetDescription: String {
        switch language {
        case "nl": return "Saldo en doel van je kind."
        case "en": return "Your child's balance and goal."
        default:   return "Solde et objectif de votre enfant."
        }
    }

    static var placeholder: Self {
        var d = KoinyWidgetData(childName: "Emma", balance: 12.50, goalName: "Vélo 🚲", goalTarget: 50)
        d.pendingMissionsCount = 2
        return d
    }
}

func readWidgetData() -> KoinyWidgetData {
    guard
        let defaults = UserDefaults(suiteName: appGroupID),
        let raw = defaults.data(forKey: "koiny_widget_data"),
        let decoded = try? JSONDecoder().decode(KoinyWidgetData.self, from: raw)
    else { return KoinyWidgetData() }
    return decoded
}

// MARK: - Timeline Provider

struct KoinyProvider: TimelineProvider {
    func placeholder(in context: Context) -> KoinyEntry {
        KoinyEntry(date: .now, data: .placeholder)
    }
    func getSnapshot(in context: Context, completion: @escaping (KoinyEntry) -> Void) {
        completion(KoinyEntry(date: .now, data: context.isPreview ? .placeholder : readWidgetData()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<KoinyEntry>) -> Void) {
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: .now)!
        completion(Timeline(entries: [KoinyEntry(date: .now, data: readWidgetData())], policy: .after(next)))
    }
}

struct KoinyEntry: TimelineEntry {
    let date: Date
    let data: KoinyWidgetData
}

// MARK: - Dynamic Gradient

func widgetGradient(for data: KoinyWidgetData) -> LinearGradient {
    if let status = data.statusInfo {
        if status.isWarning {
            // Orange/red — inactivity warning
            return LinearGradient(
                colors: [Color(red: 0.90, green: 0.35, blue: 0.13),
                         Color(red: 0.75, green: 0.18, blue: 0.18)],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
        } else if data.pendingMissionsCount > 0 {
            // Amber — missions waiting
            return LinearGradient(
                colors: [Color(red: 0.85, green: 0.55, blue: 0.05),
                         Color(red: 0.70, green: 0.35, blue: 0.05)],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
        } else {
            // Emerald — today earned
            return LinearGradient(
                colors: [Color(red: 0.02, green: 0.60, blue: 0.42),
                         Color(red: 0.02, green: 0.45, blue: 0.32)],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
        }
    }
    // Default indigo
    return LinearGradient(
        colors: [Color(red: 0.29, green: 0.37, blue: 0.96),
                 Color(red: 0.47, green: 0.33, blue: 0.96)],
        startPoint: .topLeading, endPoint: .bottomTrailing
    )
}

// MARK: - Small Widget View

struct KoinySmallView: View {
    let data: KoinyWidgetData

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 5) {
                Image(systemName: "dollarsign.circle.fill")
                    .font(.system(size: 11, weight: .black))
                    .foregroundStyle(.white.opacity(0.45))
                Text("K O I N Y")
                    .font(.system(size: 8, weight: .black))
                    .foregroundStyle(.white.opacity(0.45))
            }

            Spacer()

            Text(data.childName)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(.white.opacity(0.75))
                .lineLimit(1)

            Text(String(format: "%.2f€", data.balance))
                .font(.system(size: 32, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .minimumScaleFactor(0.6)
                .lineLimit(1)

            Spacer()

            if let status = data.statusInfo {
                // Dynamic status message (Duolingo-style)
                VStack(alignment: .leading, spacing: 1) {
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        if !status.emoji.isEmpty {
                            Text(status.emoji).font(.system(size: 11))
                        }
                        Text(status.big)
                            .font(.system(size: 22, weight: .black, design: .rounded))
                            .foregroundStyle(status.isWarning ? Color(red: 1, green: 0.85, blue: 0.5) : .white)
                            .minimumScaleFactor(0.6)
                            .lineLimit(1)
                    }
                    Text(status.small)
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(.white.opacity(0.65))
                        .lineLimit(1)
                }
            } else if let goal = data.goalName, data.goalTarget > 0 {
                VStack(alignment: .leading, spacing: 3) {
                    HStack {
                        Text(goal).font(.system(size: 9, weight: .bold))
                            .foregroundStyle(.white.opacity(0.65)).lineLimit(1)
                        Spacer()
                        Text("\(Int(data.progress * 100))%")
                            .font(.system(size: 9, weight: .black))
                            .foregroundStyle(.white.opacity(0.9))
                    }
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(.white.opacity(0.2))
                            Capsule().fill(.white)
                                .frame(width: max(4, geo.size.width * data.progress))
                        }
                    }
                    .frame(height: 5)
                }
            }
        }
        .padding(14)
        .applyWidgetBackground {
            widgetGradient(for: data)
        }
    }
}

// MARK: - Medium Widget View

struct KoinyMediumView: View {
    let data: KoinyWidgetData

    var body: some View {
        HStack(spacing: 0) {
            // Left: balance
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 5) {
                    Image(systemName: "dollarsign.circle.fill")
                        .font(.system(size: 11, weight: .black))
                        .foregroundStyle(.white.opacity(0.45))
                    Text("KOINY")
                        .font(.system(size: 8, weight: .black))
                        .foregroundStyle(.white.opacity(0.45))
                }
                Spacer()
                Text(data.childName)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.white.opacity(0.75))
                    .lineLimit(1)
                Text(String(format: "%.2f€", data.balance))
                    .font(.system(size: 36, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)
                if let status = data.statusInfo {
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        if !status.emoji.isEmpty {
                            Text(status.emoji).font(.system(size: 10))
                        }
                        Text(status.big)
                            .font(.system(size: 13, weight: .black, design: .rounded))
                            .foregroundStyle(status.isWarning ? Color(red: 1, green: 0.85, blue: 0.5) : .white)
                        Text(status.small)
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(.white.opacity(0.6))
                    }
                    .lineLimit(1)
                }
                Spacer()
            }
            .frame(maxWidth: .infinity)

            Rectangle()
                .fill(.white.opacity(0.15))
                .frame(width: 1)
                .padding(.vertical, 4)

            // Right: goal
            VStack(alignment: .leading, spacing: 6) {
                if let goal = data.goalName, data.goalTarget > 0 {
                    Text(data.goalLabel)
                        .font(.system(size: 8, weight: .black))
                        .foregroundStyle(.white.opacity(0.45))
                    Spacer()
                    Text(goal)
                        .font(.system(size: 15, weight: .black))
                        .foregroundStyle(.white)
                        .lineLimit(2)
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(.white.opacity(0.2))
                            Capsule().fill(.white)
                                .frame(width: max(4, geo.size.width * data.progress))
                        }
                    }
                    .frame(height: 6)
                    HStack {
                        Text(data.remainingLabel)
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(.white.opacity(0.6))
                        Spacer()
                        Text("\(Int(data.progress * 100))%")
                            .font(.system(size: 11, weight: .black))
                            .foregroundStyle(.white)
                    }
                    Spacer()
                } else {
                    Spacer()
                    Text(data.noGoalLabel)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(.white.opacity(0.35))
                    Spacer()
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.leading, 14)
        }
        .padding(16)
        .applyWidgetBackground {
            widgetGradient(for: data)
        }
    }
}

// MARK: - Entry View

struct KoinyWidgetEntryView: View {
    var entry: KoinyProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemMedium: KoinyMediumView(data: entry.data)
        default:            KoinySmallView(data: entry.data)
        }
    }
}

// MARK: - Widget

struct KoinyWidget: Widget {
    let kind = "KoinyWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: KoinyProvider()) { entry in
            KoinyWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Koiny")
        .description("Your child's balance and goal.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Widget Background Extension

extension View {
    @ViewBuilder
    func applyWidgetBackground<T: View>(@ViewBuilder content: () -> T) -> some View {
        if #available(iOS 17.0, *) {
            self.containerBackground(for: .widget, content: content)
        } else {
            self.background(content())
        }
    }
}

// MARK: - Previews

struct KoinyWidget_Previews: PreviewProvider {
    static var previews: some View {
        KoinyWidgetEntryView(entry: KoinyEntry(date: .now, data: .placeholder))
            .previewContext(WidgetPreviewContext(family: .systemSmall))
        
        KoinyWidgetEntryView(entry: KoinyEntry(date: .now, data: .placeholder))
            .previewContext(WidgetPreviewContext(family: .systemMedium))
    }
}
