import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { AddQuestionComponent } from "../../pages/add-question/add-question.component";
import { environment } from "../../../environments/environment";
import { Oauth2callbackComponent } from "../../components/oauth2callback/oauth2callback.component";
import { OauthLogoutcallbackComponent } from "../../components/oauth-logoutcallback/oauth-logoutcallback.component";
import { AddCriteriaComponent } from "../../pages/add-criteria/add-criteria.component";
import { CriteriaComponent } from "../../pages/criteria/criteria.component";

const routes: Routes = [
  {
    path: environment.baseUrl + "questions/new",
    component: AddQuestionComponent
  },
  {
    path: environment.baseUrl + "criteria/new",
    component: AddCriteriaComponent
  },
  {
    path: environment.baseUrl + "criteria",
    component: CriteriaComponent
  },
  {
    path: environment.baseUrl + "oauth2callback",
    component: Oauth2callbackComponent
  },
  {
    path: environment.baseUrl + "oauthLogoutcallback",
    component: OauthLogoutcallbackComponent
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      onSameUrlNavigation: "reload"
      // enableTracing: true
    })
  ],
  exports: [RouterModule]
})
export class RoutingModule {}
