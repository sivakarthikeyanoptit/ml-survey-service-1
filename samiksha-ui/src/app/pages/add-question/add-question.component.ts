import { Component, OnInit } from "@angular/core";

@Component({
  selector: "sl-add-question",
  templateUrl: "./add-question.component.html",
  styleUrls: ["./add-question.component.scss"]
})
export class AddQuestionComponent implements OnInit {
  questionForm: any;
  constructor() {}
  ngOnInit() {
    this.questionForm = {
      questions: [{ value: "" }],
      options: [{ value: "", label: "" }]
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
}
