import { Component, OnInit } from "@angular/core";
import { FormControl } from "@angular/forms";
import { QuestionsService } from "../../service/api/questions.service";

@Component({
  selector: "sl-add-question",
  templateUrl: "./add-question.component.html",
  styleUrls: ["./add-question.component.scss"]
})
export class AddQuestionComponent implements OnInit {
  questionForm: any;
  toppings = new FormControl();
  typeList: string[] = ["image/jpeg", "pdf"];
  constructor(private questionsApi: QuestionsService) {}
  ngOnInit() {
    this.questionForm = {
      questions: [{ value: "" }],
      options: [{ value: "", label: "" }],
      file: { type: [], minCount: 0, maxCount: 0 },
      validation: {}
    };
  }

  addQuestion() {
    this.questionForm.questions.push({ value: "" });
  }
  removeQuestion(i) {
    if (i > -1) {
      this.questionForm.questions.splice(i, 1);
    }
  }

  addOption() {
    this.questionForm.options.push({ value: "", label: "" });
  }
  removeOption(i) {
    if (i > -1) {
      this.questionForm.options.splice(i, 1);
    }
  }

  submit() {
    this.questionsApi
      .REST(
        "post",
        "http://localhost:4201/assessment/api/v1/questions/insert",
        this.questionForm
      )
      .then(data => {
        console.log(data);
      })
      .catch(error => {
        console.log(error);
      });
  }
}
