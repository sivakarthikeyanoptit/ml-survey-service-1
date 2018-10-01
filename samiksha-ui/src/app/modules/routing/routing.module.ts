import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { AddQuestionComponent } from "../../pages/add-question/add-question.component";

const routes: Routes = [
  { path: "questions/new", component: AddQuestionComponent }
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
