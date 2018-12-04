package auth

package auth

import akka.http.scaladsl.util.FastFuture
import com.google.common.base.Charsets
import controllers.routes
import env.Env
import models._
import org.mindrot.jbcrypt.BCrypt
import play.api.Logger
import play.api.libs.json._
import play.api.mvc._
import security.{IdGenerator, OtoroshiClaim}

import scala.concurrent.{ExecutionContext, Future}
import scala.util.Try

case class HttpAuthUser(
  id: String,
  name: String,
  password: String,
  email: String,
  metadata: JsObject = Json.obj()
) {
  def asJson: JsValue = HttpAuthUser.fmt.writes(this)
}

object HttpAuthUser {
  def fmt = new Format[HttpAuthUser] {
    override def writes(o: HttpAuthUser) = Json.obj(
      "id"     -> o.id,
      "name"     -> o.name,
      "password" -> o.password,
      "email"    -> o.email,
      "metadata" -> o.metadata,
    )
    override def reads(json: JsValue) =
      Try {
        JsSuccess(
          HttpAuthUser(
            id = (json \ "id").as[String],
            name = (json \ "name").as[String],
            password = (json \ "password").as[String],
            email = (json \ "email").as[String],
            metadata = (json \ "metadata").asOpt[JsObject].getOrElse(Json.obj())
          )
        )
      } recover {
        case e => JsError(e.getMessage)
      } get
  }
}

object HttpAuthModuleConfig extends FromJson[AuthModuleConfig] {

  lazy val logger = Logger("otoroshi-http-auth-config")

  def fromJsons(value: JsValue): HttpAuthModuleConfig =
    try {
      _fmt.reads(value).get
    } catch {
      case e: Throwable => {
        logger.error(s"Try to deserialize ${Json.prettyPrint(value)}")
        throw e
      }
    }

  val _fmt = new Format[HttpAuthModuleConfig] {

    override def reads(json: JsValue) = fromJson(json) match {
      case Left(e)  => JsError(e.getMessage)
      case Right(v) => JsSuccess(v.asInstanceOf[HttpAuthModuleConfig])
    }

    override def writes(o: HttpAuthModuleConfig) = o.asJson
  }

  override def fromJson(json: JsValue): Either[Throwable, AuthModuleConfig] =
    Try {
      Right(
        HttpAuthModuleConfig(
          id = (json \ "id").as[String],
          name = (json \ "name").as[String],
          desc = (json \ "desc").as[String],
          sessionMaxAge = (json \ "sessionMaxAge").asOpt[Int].getOrElse(86400),
          u2fEnabled = (json \ "u2fEnabled").asOpt[Boolean].getOrElse(false),
          url = (json \ "url").as[String],
          host = (json \ "host").as[String],
          headers = (json \ "headers").as[Map[String, String]]
        )
      )
    } recover {
      case e => Left(e)
    } get
}

case class HttpAuthModuleConfig(
  id: String,
  name: String,
  desc: String,
  sessionMaxAge: Int = 86400,
  u2fEnabled: Boolean = false,
  url: String,
  host: String,
  headers: Map[String, String] = Map.empty
) extends AuthModuleConfig {
  def `type`: String                                        = "http"
  override def authModule(config: GlobalConfig): AuthModule = HttpAuthModule(this)
  override def asJson = Json.obj(
    "type"          -> "http",
    "id"            -> this.id,
    "name"          -> this.name,
    "desc"          -> this.desc,
    "sessionMaxAge" -> this.sessionMaxAge,
    "u2fEnabled"       -> this.u2fEnabled,
    "url"           -> this.url,
    "host"          -> this.host,
    "headers"       -> this.headers,
  )
  def save()(implicit ec: ExecutionContext, env: Env): Future[Boolean] = env.datastores.authConfigsDataStore.set(this)
  override def cookieSuffix(desc: ServiceDescriptor)                   = s"http-auth-$id"
}

case class HttpAuthModule(authConfig: HttpAuthModuleConfig) extends AuthModule {

  import utils.future.Implicits._

  def decodeBase64(encoded: String): String = new String(OtoroshiClaim.decoder.decode(encoded), Charsets.UTF_8)

  def extractUsernamePassword(header: String): Option[(String, String)] = {
    val base64 = header.replace("Basic ", "").replace("basic ", "")
    Option(base64)
      .map(decodeBase64).map(_.split(":").toSeq).
      flatMap(a => a.headOption.flatMap(head => a.lastOption.map(last => (head, last))))

  }

  def bindUser(username: String, password: String, descriptor: ServiceDescriptor): Future[Either[String, PrivateAppsUser]] = {
    ???
  }

  def bindAdminUser(username: String, password: String): Future[Either[String, BackOfficeUser]] = {
    ???
  }

  override def paLoginPage(request: RequestHeader,
                           config: GlobalConfig,
                           descriptor: ServiceDescriptor)(implicit ec: ExecutionContext, env: Env): Future[Result] = {
    implicit val req = request
    val redirect     = request.getQueryString("redirect")
    env.datastores.authConfigsDataStore.generateLoginToken().flatMap { token =>
      Results
        .Ok(views.html.otoroshi.login(s"/privateapps/generic/callback?desc=${descriptor.id}", "POST", token, env))
        .addingToSession(
          s"pa-redirect-after-login-${authConfig.cookieSuffix(descriptor)}" -> redirect.getOrElse(
            routes.PrivateAppsController.home().absoluteURL(env.isProd && env.exposedRootSchemeIsHttps)
          )
        ).future
    }
  }

  override def paLogout(request: RequestHeader, config: GlobalConfig, descriptor: ServiceDescriptor)(
    implicit ec: ExecutionContext,
    env: Env
  ) = FastFuture.successful(None)

  override def paCallback(request: Request[AnyContent], config: GlobalConfig, descriptor: ServiceDescriptor)(
    implicit ec: ExecutionContext,
    env: Env
  ): Future[Either[String, PrivateAppsUser]] = {
    implicit val req = request
    if (authConfig.u2fEnabled) {


      request.body.asFormUrlEncoded match {
        case None => FastFuture.successful(Left("No Authorization form here"))
        case Some(form) => {
          
        }
      }

      val appId = s"${env.rootScheme}${env.backOfficeHost}"
      (ctx.request.body \ "username").asOpt[String] match {
        case Some(u) => {
          import collection.JavaConverters._
          env.datastores.u2FAdminDataStore.getUserRegistration(u).flatMap { it =>
            val authenticateRequestData = u2f.startAuthentication(appId, it.map(_._1).asJava)
            logger.debug(s"authenticateRequestData ${Json.prettyPrint(Json.parse(authenticateRequestData.toJson))}")
            env.datastores.u2FAdminDataStore
              .addRequest(authenticateRequestData.getRequestId, authenticateRequestData.toJson)
              .map {
                case true  => Ok(Json.obj("username"               -> u, "data" -> Json.parse(authenticateRequestData.toJson)))
                case false => InternalServerError(Json.obj("error" -> "error while persisting"))
              }
          }
        }
        case None => FastFuture.successful(BadRequest(Json.obj("error" -> "no username provided")))
      }


      ???
    } else {
      request.body.asFormUrlEncoded match {
        case None => FastFuture.successful(Left("No Authorization form here"))
        case Some(form) => {
          (form.get("username").map(_.last), form.get("password").map(_.last), form.get("token").map(_.last)) match {
            case (Some(username), Some(password), Some(token)) => {
              env.datastores.authConfigsDataStore.validateLoginToken(token).flatMap {
                case false => Left("Bad token").asFuture
                case true => bindUser(username, password, descriptor)
              }
            }
            case _ => {
              FastFuture.successful(Left("Authorization form is not complete"))
            }
          }
        }
      }
    }
  }

  override def boLoginPage(request: RequestHeader, config: GlobalConfig)(implicit ec: ExecutionContext,
                                                                         env: Env): Future[Result] = {
    implicit val req = request
    val redirect     = request.getQueryString("redirect")
    env.datastores.authConfigsDataStore.generateLoginToken().flatMap { token =>
      Results
        .Ok(views.html.otoroshi.login(s"/backoffice/auth0/callback", "POST", token, env))
        .addingToSession(
          "bo-redirect-after-login" -> redirect.getOrElse(
            routes.BackOfficeController.dashboard().absoluteURL(env.isProd && env.exposedRootSchemeIsHttps)
          )
        ).future
    }
  }

  override def boLogout(request: RequestHeader, config: GlobalConfig)(implicit ec: ExecutionContext, env: Env) =
    FastFuture.successful(None)

  override def boCallback(
                           request: Request[AnyContent],
                           config: GlobalConfig
                         )(implicit ec: ExecutionContext, env: Env): Future[Either[String, BackOfficeUser]] = {
    implicit val req = request
    if (authConfig.u2fEnabled) {
      ???
    } else {
      request.body.asFormUrlEncoded match {
        case None => FastFuture.successful(Left("No Authorization form here"))
        case Some(form) => {
          (form.get("username").map(_.last), form.get("password").map(_.last), form.get("token").map(_.last)) match {
            case (Some(username), Some(password), Some(token)) => {
              env.datastores.authConfigsDataStore.validateLoginToken(token).flatMap {
                case false => Left("Bad token").asFuture
                case true => bindAdminUser(username, password)
              }
            }
            case _ => {
              FastFuture.successful(Left("Authorization form is not complete"))
            }
          }
        }
      }
    }
  }
}
