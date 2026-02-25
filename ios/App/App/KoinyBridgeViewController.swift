import UIKit
import Capacitor

/// CAPBridgeViewController subclass that registers in-app plugins.
/// capacitorDidLoad() fires after the bridge is ready but before JS runs.
/// Uses registerPluginInstance() — registerPluginType() is a no-op when autoRegisterPlugins=true (Capacitor default).
class KoinyBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(BiometricPlugin())
    }
}
