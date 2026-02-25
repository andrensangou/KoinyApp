import Foundation
import Capacitor
import LocalAuthentication

/// Minimal Capacitor plugin for biometric authentication (Face ID / Touch ID).
/// Directly uses iOS LocalAuthentication — no external SPM dependency.
@objc(BiometricPlugin)
public class BiometricPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "BiometricPlugin"
    public let jsName = "KoinyBiometric"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "verifyIdentity", returnType: CAPPluginReturnPromise)
    ]

    /// Returns whether biometric authentication (Face ID / Touch ID) is available.
    @objc func isAvailable(_ call: CAPPluginCall) {
        let context = LAContext()
        var error: NSError?
        let canEvaluate = context.canEvaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            error: &error
        )

        var biometryType = "none"
        if canEvaluate {
            switch context.biometryType {
            case .faceID:
                biometryType = "face"
            case .touchID:
                biometryType = "fingerprint"
            default:
                biometryType = "none"
            }
        }

        call.resolve([
            "isAvailable": canEvaluate,
            "biometryType": biometryType
        ])
    }

    /// Prompts the user for biometric (or device passcode if useFallback = true).
    @objc func verifyIdentity(_ call: CAPPluginCall) {
        let reason = call.getString("reason") ?? "Vérifiez votre identité"
        let useFallback = call.getBool("useFallback") ?? true

        // .deviceOwnerAuthentication = Face ID + passcode fallback
        // .deviceOwnerAuthenticationWithBiometrics = Face ID only
        let policy: LAPolicy = useFallback
            ? .deviceOwnerAuthentication
            : .deviceOwnerAuthenticationWithBiometrics

        let context = LAContext()
        context.evaluatePolicy(policy, localizedReason: reason) { success, error in
            DispatchQueue.main.async {
                if success {
                    call.resolve()
                } else {
                    let msg = error?.localizedDescription ?? "Authentication failed"
                    call.reject(msg)
                }
            }
        }
    }
}
