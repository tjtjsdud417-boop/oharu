import ExpoModulesCore
import Foundation
import WidgetKit

// Host app only. Uses Expo Modules API, not React Native legacy bridge APIs.
public final class OharuWidgetModule: Module {
  private let writerQueue = DispatchQueue(label: "com.oharu.today.widget-snapshot")
  public func definition() -> ModuleDefinition {
    Name("OharuIOSWidget")
    AsyncFunction("updateSnapshot") { (json: String) -> [String: String] in
      guard let data = json.data(using: .utf8), data.count <= OharuWidgetStorage.maxBytes,
            let input = try? JSONDecoder().decode(OharuWidgetInput.self, from: data),
            input.schemaVersion == 1 else { throw SnapshotError.invalidInput }
      if input.enabled {
        try OharuWidgetStorage.write(input.sanitized(now: Date()))
      } else {
        try OharuWidgetStorage.clear()
      }
      // Requests a refresh; the system, not this call, chooses rendering time.
      WidgetCenter.shared.reloadTimelines(ofKind: OharuWidgetStorage.kind)
      return ["status": input.enabled ? "updated" : "cleared"]
    }.runOnQueue(writerQueue)
  }
}
