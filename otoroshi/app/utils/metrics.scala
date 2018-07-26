package utils

import java.lang.management.ManagementFactory
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

import com.codahale.metrics.jmx.JmxReporter
import com.codahale.metrics.jvm._
import com.codahale.metrics.{Meter, MetricRegistry, Timer}
import env.Env
import events.StatsdConfig
import org.coursera.metrics.datadog.DatadogReporter
import org.coursera.metrics.datadog.transport.HttpTransport
import play.api.Logger
import play.api.libs.json.{JsValue, Json}

import scala.concurrent.duration.SECONDS

object Metrics {

}

object MetricsContext {
  def apply(): MetricsContext = new MetricsContext()
}

class MetricsContext() {

  val logger = Logger("otoroshi-metrics-ctx")

  val registry = new MetricRegistry()

  private val jmxReporterRef = new AtomicReference[JmxReporter]()
  private val datadogReporterRef = new AtomicReference[DatadogReporter]()

  def registerJVMMetrics(): MetricsContext = {
    registry.register("buffer-pools", new BufferPoolMetricSet(ManagementFactory.getPlatformMBeanServer))
    registry.register("cached-threads", new CachedThreadStatesGaugeSet(10, TimeUnit.SECONDS))
    registry.register("classloading", new ClassLoadingGaugeSet())
    registry.register("garbage-collector", new GarbageCollectorMetricSet())
    registry.register("jvm-attributes", new JvmAttributeGaugeSet())
    registry.register("memory-usage", new MemoryUsageGaugeSet())
    registry.register("threads", new ThreadStatesGaugeSet())
    this
  }

  def startReporting(config: StatsdConfig)(implicit env: Env): Unit = {
    logger.warn(config.toString)
    config.datadogApiKey.foreach { apikey =>
      logger.warn("Setup datadog metrics reporter ...")
      val expansions = DatadogReporter.Expansion.ALL
      val httpTransport = new HttpTransport.Builder().withApiKey(apikey).build()
      val dataDogReporter = DatadogReporter.forRegistry(registry)
        .withPrefix(s"otoroshi.${if (env.isDev) "env-dev" else "env-prod"}.node-${env.snowflakeSeed}.")
        .withHost(s"${if (env.isDev) "env-dev" else "env-prod"}.node-${env.snowflakeSeed}")
        .withTransport(httpTransport)
        .withExpansions(expansions)
        .build()
      val jmxReporter = JmxReporter.forRegistry(registry).build()
      dataDogReporter.start(10, SECONDS)
      jmxReporter.start()
      datadogReporterRef.set(dataDogReporter)
      jmxReporterRef.set(jmxReporter)
    }
  }

  def stopReporting(): Unit = {
    logger.warn("Stopping datadog metrics reporter ...")
    Option(datadogReporterRef.get()).foreach(_.stop())
    Option(jmxReporterRef.get()).foreach(_.stop())
  }
}

case class MeterView(count: Long,
                     meanRate: Double,
                     oneMinuteRate: Double,
                     fiveMinuteRate: Double,
                     fifteenMinuteRate: Double) {
  def toJson: JsValue = Json.obj(
    "count"             -> count,
    "meanRate"          -> meanRate,
    "oneMinuteRate"     -> oneMinuteRate,
    "fiveMinuteRate"    -> fiveMinuteRate,
    "fifteenMinuteRate" -> fifteenMinuteRate
  )
}

object MeterView {
  def apply(meter: Meter): MeterView =
    new MeterView(meter.getCount,
                  meter.getMeanRate,
                  meter.getOneMinuteRate,
                  meter.getFiveMinuteRate,
                  meter.getFifteenMinuteRate)
}

case class TimerView(count: Long,
                     meanRate: Double,
                     oneMinuteRate: Double,
                     fiveMinuteRate: Double,
                     fifteenMinuteRate: Double) {
  def toJson: JsValue = Json.obj(
    "count"             -> count,
    "meanRate"          -> meanRate,
    "oneMinuteRate"     -> oneMinuteRate,
    "fiveMinuteRate"    -> fiveMinuteRate,
    "fifteenMinuteRate" -> fifteenMinuteRate
  )
}

object TimerView {
  def apply(meter: Timer): TimerView =
    new TimerView(meter.getCount,
                  meter.getMeanRate,
                  meter.getOneMinuteRate,
                  meter.getFiveMinuteRate,
                  meter.getFifteenMinuteRate)
}
