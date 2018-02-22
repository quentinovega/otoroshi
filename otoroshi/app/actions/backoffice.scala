package actions

import java.util.concurrent.ConcurrentHashMap

import akka.http.scaladsl.model.Uri
import akka.http.scaladsl.model.Uri.Path
import akka.http.scaladsl.util.FastFuture
import controllers.routes
import env.Env
import events.{Alerts, BlackListedBackOfficeUserAlert}
import models.BackOfficeUser
import play.api.libs.json.Json
import play.api.mvc._
import security.IdGenerator

import scala.concurrent.{ExecutionContext, Future}

case class BackOfficeActionContext[A](request: Request[A], user: Option[BackOfficeUser]) {
  def connected: Boolean = user.isDefined
  def from: String       = request.headers.get("X-Forwarded-For").getOrElse(request.remoteAddress)
}

case class BackOfficeActionContextAuth[A](request: Request[A], user: BackOfficeUser) {
  def from: String = request.headers.get("X-Forwarded-For").getOrElse(request.remoteAddress)
}

class BackOfficeAction(val parser: BodyParser[AnyContent])(implicit env: Env)
    extends ActionBuilder[BackOfficeActionContext, AnyContent]
    with ActionFunction[Request, BackOfficeActionContext] {

  implicit lazy val ec = env.backOfficeExecutionContext

  override def invokeBlock[A](request: Request[A],
                              block: (BackOfficeActionContext[A]) => Future[Result]): Future[Result] = {
    val host = if (request.host.contains(":")) request.host.split(":")(0) else request.host
    host match {
      case env.backOfficeHost => {
        request.session.get("bousr").map { id =>
          env.datastores.backOfficeUserDataStore.findById(id).flatMap {
            case Some(user) => block(BackOfficeActionContext(request, Some(user)))
            case None       => block(BackOfficeActionContext(request, None))
          }
        } getOrElse {
          block(BackOfficeActionContext(request, None))
        }
      }
      case _ => {
        // TODO : based on Accept header
        FastFuture.successful(Results.NotFound(views.html.otoroshi.error("Not found", env)))
      }
    }
  }

  override protected def executionContext: ExecutionContext = ec
}

class BackOfficeActionAuth(val parser: BodyParser[AnyContent])(implicit env: Env)
    extends ActionBuilder[BackOfficeActionContextAuth, AnyContent]
    with ActionFunction[Request, BackOfficeActionContextAuth] {

  val tokens = new ConcurrentHashMap[String, Unit]()

  def generateToken(): String = {
    val tok = IdGenerator.extendedToken
    tokens.putIfAbsent(tok, ())
    println(s"generate token: $tok")
    tok
  }

  def validateToken(tok: String): Boolean = {
    import collection.JavaConverters._
    println(s"verif for $tok")
    println(tokens.asScala.mkString(", "))
    if (tokens.containsKey(tok)) {
      tokens.remove(tok)
      true
    } else {
      false
    }
  }

  implicit lazy val ec = env.backOfficeExecutionContext

  override def invokeBlock[A](request: Request[A],
                              block: (BackOfficeActionContextAuth[A]) => Future[Result]): Future[Result] = {

    implicit val req = request

    val host = if (request.host.contains(":")) request.host.split(":")(0) else request.host
    host match {
      case env.backOfficeHost => {

        def callAction() = {
          // val redirectTo = env.rootScheme + env.backOfficeHost + controllers.routes.Auth0Controller.backOfficeLogin(Some(s"${env.rootScheme}${request.host}${request.uri}")).url
          val redirectTo = env.rootScheme + request.host + controllers.routes.BackOfficeController.index().url
          request.session.get("bousr").map { id =>
            env.datastores.backOfficeUserDataStore.findById(id).flatMap {
              case Some(user) => {
                env.datastores.backOfficeUserDataStore.blacklisted(user.email).flatMap {
                  case true => {
                    Alerts.send(BlackListedBackOfficeUserAlert(env.snowflakeGenerator.nextIdStr(), env.env, user))
                    FastFuture.successful(
                      Results.NotFound(views.html.otoroshi.error("Error", env)).removingFromSession("bousr")(request)
                    )
                  }
                  case false => {
                    val tok = generateToken()
                    block(BackOfficeActionContextAuth(request, user)).map { result =>
                      result.withHeaders("otoroshi-xsrf-token" -> tok)
                    }
                  }
                }
              }
              case None =>
                FastFuture.successful(
                  Results
                    .Redirect(redirectTo)
                    .addingToSession(
                      "bo-redirect-after-login" -> s"${env.rootScheme}${request.host}${request.uri}"
                    )
                )
            }
          } getOrElse {
            FastFuture.successful(
              Results
                .Redirect(redirectTo)
                .addingToSession(
                  "bo-redirect-after-login" -> s"${env.rootScheme}${request.host}${request.uri}"
                )
            )
          }
        }

        request.headers.get("otoroshi-xsrf-token") match {
          case _ if request.method == "GET" => request.headers
            .get("Origin")
            .map(Uri.apply)
            .orElse(request.headers.get("Referer").map(Uri.apply).map(uri => uri.copy(path = Path.Empty)))
            .map(u => u.authority.copy(port = 0).toString()) match {
            case Some(origin) if origin == env.backOfficeHost => callAction()
            case _ => FastFuture.successful(Results.ExpectationFailed(Json.obj("error" -> "Bad Origin")))
          }
          case Some(tok) if validateToken(tok) => request.headers
            .get("Origin")
            .map(Uri.apply)
            .orElse(request.headers.get("Referer").map(Uri.apply).map(uri => uri.copy(path = Path.Empty)))
            .map(u => u.authority.copy(port = 0).toString()) match {
            case Some(origin) if origin == env.backOfficeHost => callAction()
            case _ => FastFuture.successful(Results.ExpectationFailed(Json.obj("error" -> "Bad Origin")))
          }
          case _ => FastFuture.successful(Results.ExpectationFailed(Json.obj("error" -> "Bad Token")))
        }
      }
      case _ => {
        // TODO : based on Accept header
        FastFuture.successful(Results.NotFound(views.html.otoroshi.error("Not found", env)))
      }
    }
  }

  override protected def executionContext: ExecutionContext = ec
}
