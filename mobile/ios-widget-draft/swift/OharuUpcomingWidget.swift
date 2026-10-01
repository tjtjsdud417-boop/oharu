import SwiftUI
import WidgetKit

struct OharuWidgetEntry: TimelineEntry {
  let date: Date
  let tasks: [OharuWidgetTask]
  let showTitlesOnHome: Bool
  let stale: Bool
}

struct OharuWidgetProvider: TimelineProvider {
  func placeholder(in context: Context) -> OharuWidgetEntry {
    OharuWidgetEntry(date: Date(), tasks: [], showTitlesOnHome: false, stale: false)
  }
  private func entry(at date: Date, snapshot: OharuWidgetSnapshot?) -> OharuWidgetEntry {
    guard let snapshot, date < snapshot.expiresAt else {
      return OharuWidgetEntry(date: date, tasks: [], showTitlesOnHome: false, stale: true)
    }
    return OharuWidgetEntry(date: date, tasks: snapshot.tasks.filter { $0.dueDate > date },
      showTitlesOnHome: snapshot.showTitlesOnHome, stale: false)
  }
  func getSnapshot(in context: Context, completion: @escaping (OharuWidgetEntry) -> Void) {
    // No private example text or real task titles in the gallery preview.
    completion(context.isPreview ? placeholder(in: context) : entry(at: Date(), snapshot: OharuWidgetStorage.read()))
  }
  func getTimeline(in context: Context, completion: @escaping (Timeline<OharuWidgetEntry>) -> Void) {
    let now = Date()
    let snapshot = OharuWidgetStorage.read(now: now)
    var dates = [now]
    if let snapshot {
      dates += snapshot.tasks.map { $0.dueDate.addingTimeInterval(1) }.filter { $0 > now && $0 < snapshot.expiresAt }
      dates.append(snapshot.expiresAt.addingTimeInterval(1))
    }
    let entries = Array(Set(dates)).sorted().map { entry(at: $0, snapshot: snapshot) }
    completion(Timeline(entries: entries, policy: .after(now.addingTimeInterval(15 * 60))))
  }
}

struct OharuWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: OharuWidgetEntry
  private var countText: String { entry.stale ? "앱에서 새로고침" : "예정된 할 일 \(entry.tasks.count)개" }

  @ViewBuilder private var content: some View {
    switch family {
    case .accessoryInline:
      // Lock Screen accessories NEVER render task titles, even after home opt-in.
      Label(entry.stale ? "오하루 열기" : "할 일 \(entry.tasks.count)개", systemImage: "checklist")
    case .accessoryCircular:
      VStack(spacing: 1) {
        Image(systemName: entry.stale ? "arrow.clockwise" : "checkmark.circle")
        Text(entry.stale ? "열기" : "\(entry.tasks.count)").font(.headline)
      }.accessibilityLabel(countText)
    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 2) {
        Text("오하루").font(.headline)
        Text(countText).font(.caption).lineLimit(2)
      }
    default:
      VStack(alignment: .leading, spacing: 8) {
        Label("오하루", systemImage: "checkmark.circle.fill").font(.headline)
        Text(countText).font(.subheadline).foregroundStyle(.secondary)
        if !entry.stale && entry.showTitlesOnHome {
          ForEach(Array(entry.tasks.prefix(family == .systemSmall ? 1 : 3))) { task in
            HStack(alignment: .firstTextBaseline) {
              Text(task.title).lineLimit(1)
              Spacer(minLength: 4)
              Text(task.dueDate, style: .time).font(.caption).foregroundStyle(.secondary)
            }.privacySensitive()
          }
        } else if !entry.stale {
          Text("내용은 앱에서 확인하세요").font(.caption).foregroundStyle(.secondary)
        }
        Spacer(minLength: 0)
      }.padding(4)
    }
  }

  var body: some View {
    if #available(iOS 17.0, *) {
      content.containerBackground(.fill.tertiary, for: .widget)
        .widgetURL(URL(string: "oharu://widget"))
    } else {
      content.widgetURL(URL(string: "oharu://widget"))
    }
  }
}

@main
struct OharuUpcomingWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: OharuWidgetStorage.kind, provider: OharuWidgetProvider()) { entry in
      OharuWidgetView(entry: entry)
    }
    .configurationDisplayName("오하루 · 예정된 할 일")
    .description("홈 화면과 잠금 화면에서 예정된 할 일 개수를 확인하세요.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
  }
}
