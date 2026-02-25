import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    // MARK: - Scene Lifecycle

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let window = UIWindow(windowScene: windowScene)
        // KoinyBridgeViewController registers BiometricPlugin in capacitorDidLoad(),
        // which fires after the bridge is ready but before JS runs.
        let vc = KoinyBridgeViewController()
        window.rootViewController = vc
        self.window = window
        window.makeKeyAndVisible()

        syncWidgetData()
    }

    func sceneDidDisconnect(_ scene: UIScene) {}

    // MARK: - Deep Link / OAuth Callback Handling
    // Required for UIScene lifecycle — routes com.koiny.app://callback to Capacitor's App plugin.
    // ApplicationDelegateProxy has no scene() method; we replicate its internal logic directly.
    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url else { return }
        print("[SceneDelegate] 🔗 Deep link received: \(url.absoluteString)")
        NotificationCenter.default.post(name: .capacitorOpenURL, object: [
            "url": url,
            "options": [:]
        ])
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        syncWidgetData()
    }

    func sceneWillResignActive(_ scene: UIScene) {}

    func sceneWillEnterForeground(_ scene: UIScene) {
        syncWidgetData()
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
        syncWidgetData()
    }

    // MARK: - Widget Data Sync

    /// Reads child data written by the Capacitor web layer (Preferences) and
    /// copies it into the App Group UserDefaults so the widget can display it.
    /// Safe to call on Simulator — gracefully handles missing App Groups.
    private func syncWidgetData() {
        do {
            guard let json = UserDefaults.standard.string(forKey: "CapacitorStorage.koiny_widget_data"),
                  let raw  = json.data(using: .utf8)
            else { return }

            let payload = try JSONDecoder().decode(KoinyWidgetBridge.Payload.self, from: raw)
            KoinyWidgetBridge.update(
                childName:   payload.childName,
                balance:     payload.balance,
                goalName:    payload.goalName,
                goalTarget:  payload.goalTarget
            )
        } catch {
            print("[SceneDelegate] ⚠️ Widget sync skipped: \(error.localizedDescription)")
        }
    }
}
