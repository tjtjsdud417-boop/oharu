import Foundation

// Compile into BOTH the host module and the WidgetKit extension targets.
// The App Group must already exist and be provisioned; this code never creates it.
enum OharuWidgetStorage {
  static let kind = "OharuUpcomingWidget"
  static let maxBytes = 32_768
  static let lifetime: TimeInterval = 6 * 60 * 60
  static let window: TimeInterval = 7 * 24 * 60 * 60

  static func fileURL() throws -> URL {
    guard let group = Bundle.main.object(forInfoDictionaryKey: "OharuWidgetAppGroup") as? String,
          group.hasPrefix("group."), !group.contains("__"),
          let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)
    else { throw SnapshotError.appGroupUnavailable }
    return container.appendingPathComponent("oharu-widget-v1.json", isDirectory: false)
  }

  static func read(now: Date = Date()) -> OharuWidgetSnapshot? {
    guard let url = try? fileURL(),
          let size = try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize,
          size <= maxBytes,
          let data = try? Data(contentsOf: url), data.count <= maxBytes,
          let snapshot = try? JSONDecoder().decode(OharuWidgetSnapshot.self, from: data),
          snapshot.schemaVersion == 1,
          snapshot.tasks.count <= 60,
          snapshot.generatedAt.isFinite,
          snapshot.generatedAt <= now.timeIntervalSince1970 + 60,
          snapshot.generatedAt > now.timeIntervalSince1970 - lifetime
    else { return nil }
    return snapshot
  }

  static func write(_ snapshot: OharuWidgetSnapshot) throws {
    var url = try fileURL()
    let data = try JSONEncoder().encode(snapshot)
    guard data.count <= maxBytes else { throw SnapshotError.invalidInput }
    // Atomic replaces avoid readers observing half-written JSON. Complete protection
    // keeps the shared file inaccessible while the device is locked.
    try data.write(to: url, options: [.atomic, .completeFileProtection])
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    try url.setResourceValues(values)
  }

  static func clear() throws {
    let url = try fileURL()
    if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }
  }
}

enum SnapshotError: Error { case invalidInput, appGroupUnavailable }

struct OharuWidgetTask: Codable, Identifiable {
  let id: String
  let title: String
  let dueAt: Double // Unix milliseconds, matching the existing mobile snapshot.
  var dueDate: Date { Date(timeIntervalSince1970: dueAt / 1000) }
}

struct OharuWidgetSnapshot: Codable {
  let schemaVersion: Int
  let generatedAt: TimeInterval // Native-created seconds; not accepted from JS.
  let showTitlesOnHome: Bool
  let tasks: [OharuWidgetTask]
  var expiresAt: Date { Date(timeIntervalSince1970: generatedAt + OharuWidgetStorage.lifetime) }
}

struct OharuWidgetInput: Decodable {
  let schemaVersion: Int
  let enabled: Bool
  let showTitlesOnHome: Bool
  let tasks: [OharuWidgetTask]

  func sanitized(now: Date) throws -> OharuWidgetSnapshot {
    guard schemaVersion == 1, tasks.count <= 60 else { throw SnapshotError.invalidInput }
    var ids = Set<String>()
    var accepted: [OharuWidgetTask] = []
    for task in tasks {
      guard task.id.range(of: "^[A-Za-z0-9_-]{1,128}$", options: .regularExpression) != nil,
            ids.insert(task.id).inserted,
            task.dueAt.isFinite, task.dueAt.rounded() == task.dueAt,
            task.title.utf16.count <= 500 else { throw SnapshotError.invalidInput }
      guard task.dueDate > now, task.dueDate <= now.addingTimeInterval(OharuWidgetStorage.window) else { continue }
      let clean = task.title.replacingOccurrences(
        of: "[\\x{0000}-\\x{001F}\\x{007F}\\x{202A}-\\x{202E}\\x{2066}-\\x{2069}]",
        with: " ", options: .regularExpression).trimmingCharacters(in: .whitespacesAndNewlines)
      accepted.append(OharuWidgetTask(id: task.id, title: showTitlesOnHome ? String(clean.prefix(140)) : "", dueAt: task.dueAt))
    }
    accepted.sort { $0.dueAt == $1.dueAt ? $0.id < $1.id : $0.dueAt < $1.dueAt }
    return OharuWidgetSnapshot(schemaVersion: 1, generatedAt: now.timeIntervalSince1970,
      showTitlesOnHome: showTitlesOnHome, tasks: accepted)
  }
}
