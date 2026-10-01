package __PACKAGE__

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.widget.RemoteViews
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Private local snapshot only. No network, credentials, task mutation, or alarms. */
class OharuWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    ids.forEach { render(context, manager, it) }
  }
  companion object {
    private const val STORE = "oharu_widget"
    fun save(context: Context, tasks: JSONArray) {
      context.getSharedPreferences(STORE, Context.MODE_PRIVATE).edit().putString("tasks", tasks.toString()).apply()
      val manager = AppWidgetManager.getInstance(context)
      manager.getAppWidgetIds(ComponentName(context, OharuWidgetProvider::class.java)).forEach { render(context, manager, it) }
    }
    private fun render(context: Context, manager: AppWidgetManager, id: Int) {
      val views = RemoteViews(context.packageName, R.layout.oharu_widget)
      val items = try { JSONArray(context.getSharedPreferences(STORE, Context.MODE_PRIVATE).getString("tasks", "[]")) } catch (_: Exception) { JSONArray() }
      val now = System.currentTimeMillis()
      val upcoming = (0 until items.length()).mapNotNull { items.optJSONObject(it) }.filter { it.optLong("dueAt") > now }.sortedBy { it.optLong("dueAt") }.take(3)
      val format = SimpleDateFormat("M/d HH:mm", Locale.getDefault())
      val text = if (upcoming.isEmpty()) context.getString(R.string.oharu_widget_empty) else upcoming.joinToString("\n\n") {
        "${format.format(Date(it.optLong("dueAt")))}  ${it.optString("title") }"
      }
      views.setTextViewText(R.id.oharu_widget_tasks, text)
      val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
      if (launch != null) {
        val action = PendingIntent.getActivity(context, 731, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        views.setOnClickPendingIntent(R.id.oharu_widget_root, action)
      }
      manager.updateAppWidget(id, views)
    }
  }
}

class OharuWidgetModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "OharuWidget"
  @ReactMethod fun updateSnapshot(raw: String, promise: Promise) {
    try {
      require(raw.length <= 128000)
      val input = JSONArray(raw)
      require(input.length() <= 60)
      val clean = JSONArray()
      val seen = mutableSetOf<String>()
      for (i in 0 until input.length()) {
        val item = input.getJSONObject(i)
        val id = item.getString("id")
        val title = item.getString("title")
        val due = item.getDouble("dueAt")
        require(id.matches(Regex("[A-Za-z0-9_:.-]{1,128}")) && seen.add(id))
        require(title.isNotBlank() && title.length <= 500)
        require(due.isFinite() && due >= 0 && due <= 8640000000000000.0 && due % 1.0 == 0.0)
        clean.put(JSONObject().put("id",id).put("title",title.replace(Regex("[\\p{Cntrl}\\u202A-\\u202E\\u2066-\\u2069]")," ").take(160)).put("dueAt",due.toLong()))
      }
      OharuWidgetProvider.save(reactApplicationContext,clean)
      promise.resolve(true)
    } catch (_: Exception) { promise.reject("INVALID_WIDGET_SNAPSHOT", "위젯 할 일 목록을 저장하지 못했어요") }
  }
}
class OharuWidgetPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(OharuWidgetModule(context))
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
