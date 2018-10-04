import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { AddQuestionComponent } from "../../pages/add-question/add-question.component";
import { environment } from "../../../environments/environment";
import { Oauth2callbackComponent } from "../../components/oauth2callback/oauth2callback.component";
import { OauthLogoutcallbackComponent } from "../../components/oauth-logoutcallback/oauth-logoutcallback.component";

const routes: Routes = [
  {
    path: "questions/new",
    component: AddQuestionComponent
  },
  {
    path: "oauth2callback",
    component: Oauth2callbackComponent
  },
  {
    path: "oauthLogoutcallback",
    component: OauthLogoutcallbackComponent
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(
      routes
      // { enableTracing: true }
    )
  ],
  exports: [RouterModule]
})
export class RoutingModule {}
