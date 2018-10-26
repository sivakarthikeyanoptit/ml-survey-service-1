import { Component, OnInit, Inject } from "@angular/core";
import { FormControl } from "@angular/forms";
import { QuestionsService } from "../../service/api/questions.service";

import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material";
import { Router } from "@angular/router";
import { HeaderTextService } from "../../service/toolbar/header-text.service";

@Component({
  selector: "sl-add-question",
  templateUrl: "./add-question.component.html",
  styleUrls: ["./add-question.component.scss"]
})
export class AddQuestionComponent implements OnInit {
  criteria: any = JSON.parse(localStorage.getItem("criteria"));
  questionForm: any = JSON.parse(localStorage.getItem("questions")) || [];
  toppings = new FormControl();
  constructor(
    private questionsApi: QuestionsService,
    public dialog: MatDialog,
    private _router: Router,
    private headerTextService: HeaderTextService
  ) {
    // if (!this.criteria) {
    //   var r = confirm("Please create criteria first.");
    //   if (r == true) {
    //     this._router.navigate(["criteria"]);
    //   } else {
    //     // this._router.navigate(["criteria"]);
    //   }
    // }
  }

  openDialog(i): void {
    const dialogRef = this.dialog.open(DialogOverviewExampleDialog, {
      width: "75%",
      height: "80%",
      data: this.questionForm[i],
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      // console.log(result);
      if (result) {
        this.questionForm[i] = result;
        localStorage.setItem("questions", JSON.stringify(this.questionForm));
        // this.addToCriteria(result);
      } else {
        window.location.reload();
        // delete this.questionForm[i];
      }
    });
  }

  async duplicate(i) {
    let duplicate = {},
      array = Object.keys(JSON.parse(JSON.stringify(this.questionForm[i])));
    array.forEach(key => {
      duplicate[key] =
        ["externalId", "children", "parentId"].indexOf(key) == -1
          ? typeof this.questionForm[i][key] == "string"
            ? "" + this.questionForm[i][key]
            : JSON.parse(JSON.stringify(this.questionForm[i][key]))
          : [];
    });
    await this.questionForm.push(duplicate);
    this.openDialog(this.questionForm.length - 1);
  }
  delete(i) {
    this.questionForm.splice(i, 1);
    localStorage.setItem("questions", JSON.stringify(this.questionForm));
    window.location.reload();
  }

  addQuestion() {
    this.questionForm.push({
      questions: [],
      options: [{ value: "", label: "" }],
      visibleIf: [{}],
      file: {
        required: false,
        type: ["image/jpeg"],
        minCount: 1,
        maxCount: 0,
        caption: false
      },
      validation: {
        required: true
      },
      children: [],
      fileName: [],
      showRemarks: false,
      isCompleted: false,
      remarks: "",
      value: "",
      canBeNotApplicable: false,
      notApplicable: "",
      usedForScoring: "",
      modeOfCollection: "onfield",
      questionType: "auto",
      questionGroup: ["A1"],
      accessibility: "local",
      payload: {}
    });

    this.openDialog(this.questionForm.length - 1);
  }

  ngOnInit() {
    this.headerTextService.setHeader("Add Questions");
  }
}

@Component({
  selector: "question-dialog",
  templateUrl: "question-dialog.html"
})
export class DialogOverviewExampleDialog implements OnInit {
  public evidences: any;
  public sections: any;
  criteria: any;
  questions: any;
  isNumber: boolean;
  oldParent: string;
  typeList: string[] = ["image/jpeg"];

  // sections: any = [];

  ngOnInit(): void {
    this.evidences = [
      {
        externalId: "BL",
        tip: "Some tip at evidence level.",
        name: "Book Look",
        description: "Some description about evidence",
        startTime: "",
        endTime: "",
        isSubmitted: false,
        sections: [],
        modeOfCollection: "onfield",
        canBeNotApplicable: true
      },
      {
        externalId: "LW",
        tip: "Some tip at evidence level.",
        name: "Learning Walk",
        description: "Some description about evidence",
        startTime: "",
        endTime: "",
        isSubmitted: false,
        sections: [],
        modeOfCollection: "onfield",
        canBeNotApplicable: true
      },
      {
        externalId: "IP",
        tip: "Some tip at evidence level.",
        name: "Interview Principal",
        description: "Some description about evidence",
        startTime: "",
        endTime: "",
        isSubmitted: false,
        sections: [],
        modeOfCollection: "onfield",
        canBeNotApplicable: true
      },
      {
        externalId: "CO",
        tip: "Some tip at evidence level.",
        name: "Classroom Observation",
        description: "Some description about evidence",
        startTime: "",
        endTime: "",
        isSubmitted: false,
        sections: [],
        modeOfCollection: "onfield",
        canBeNotApplicable: true
      },
      {
        externalId: "IT",
        tip: "Some tip at evidence level.",
        name: "Interview Teacher",
        description: "Some description about evidence",
        startTime: "",
        endTime: "",
        isSubmitted: false,
        sections: [],
        modeOfCollection: "onfield",
        canBeNotApplicable: true
      },
      {
        externalId: "IS",
        tip: "Some tip at evidence level.",
        name: "Interview Student",
        description: "Some description about evidence",
        startTime: "",
        endTime: "",
        isSubmitted: false,
        sections: [],
        modeOfCollection: "onfield",
        canBeNotApplicable: true
      },
      {
        externalId: "AC3",
        tip: "Some tip at evidence level.",
        name: "Assessment- Class 3",
        description: "Some description about evidence",
        startTime: "",
        endTime: "",
        isSubmitted: false,
        sections: [],
        modeOfCollection: "onfield",
        canBeNotApplicable: true
      },
      {
        externalId: "AC5",
        tip: "Some tip at evidence level.",
        name: "Assessment- Class 5",
        description: "Some description about evidence",
        startTime: "",
        endTime: "",
        isSubmitted: false,
        sections: [],
        modeOfCollection: "onfield",
        canBeNotApplicable: true
      },
      {
        externalId: "AC8",
        tip: "Some tip at evidence level.",
        name: "Assessment- Class 8",
        description: "Some description about evidence",
        startTime: "",
        endTime: "",
        isSubmitted: false,
        sections: [],
        modeOfCollection: "onfield",
        canBeNotApplicable: true
      },
      {
        externalId: "PI",
        tip: "Some tip at evidence level.",
        name: "Parent Information",
        description: "Some description about evidence",
        startTime: "",
        endTime: "",
        isSubmitted: false,
        sections: [],
        modeOfCollection: "onfield",
        canBeNotApplicable: true
      }
    ];

    this.sections = [
      { name: "Survey Questions", questions: [] },
      { name: "Data to be Filled", questions: [] },
      { name: "Group Interview", questions: [] },
      { name: "Individual Interview", questions: [] }
    ];
  }

  constructor(
    public dialogRef: MatDialogRef<DialogOverviewExampleDialog>,
    @Inject(MAT_DIALOG_DATA) public question: any
  ) {
    this.question.oldParent = this.question.parentId;
    this.questions = JSON.parse(localStorage.getItem("questions"));
    this.criteria = JSON.parse(localStorage.getItem("criteria"));
    // console.log("oldParent--->", this.oldParent);
  }

  // addQuestion() {
  //   this.question.questions.push({ value: "" });
  // }
  removeQuestion(i) {
    if (i > -1) {
      this.question.questions.splice(i, 1);
    }
  }

  addOption() {
    this.question.options.push({ value: "", label: "" });
  }
  removeOption(i) {
    if (i > -1) {
      this.question.options.splice(i, 1);
    }
  }

  pushEvidence(i) {
    this.question.sections = this.criteria.evidences[i].sections;
    this.question.evidenceName = this.criteria.evidences[i].name;
    this.question.evidenceIndex = i;
  }
  pushEvidenceSections(i) {
    this.question.sectionName = this.criteria.evidences[
      this.question.evidenceIndex
    ].sections[i].name;
    this.question.sectionIndex = i;
  }

  updateParent() {
    // let question = this.question;
    // console.log(this.questions);
    // let qId = this.questions.findIndex(function(ques) {
    //   return question.parentId == ques.externalId;
    // });
    // console.log(qId);
    // if (!this.questions[qId].childrens) this.questions[qId].childrens = [];
    // this.questions[qId].childrens.push(this.question.externalId);
    // console.log(this.questions[qId]);
    // localStorage.setItem("questions", JSON.stringify(this.questions));
  }

  save(): void {
    this.dialogRef.close(this.question);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  questionType(type) {
    if (type != "matrix") {
      delete this.question.instanceIdentifier;
      delete this.question.noOfInstances;
      delete this.question.notApplicable;
      delete this.question.instanceQuestions;

      if (["radio", "multiselect"].indexOf(type) < 0) {
        delete this.question.options;
      } else {
        this.question.options = this.question.options || [
          { value: "", label: "" }
        ];
      }
    } else {
      delete this.question.options;
    }
  }
}
