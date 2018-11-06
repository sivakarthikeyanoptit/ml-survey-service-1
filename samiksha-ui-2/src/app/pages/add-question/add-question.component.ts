import { Component, OnInit, Inject } from "@angular/core";
import { FormControl } from "@angular/forms";
import { Observable } from "rxjs";
import { map, startWith } from "rxjs/operators";
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material";
import { Router } from "@angular/router";
import { HeaderTextService } from "../../service/toolbar/header-text.service";
import { ApiService } from "../../service/api/api.service";

@Component({
  selector: "sl-add-question",
  templateUrl: "./add-question.component.html",
  styleUrls: ["./add-question.component.scss"]
})
export class AddQuestionComponent implements OnInit {
  question: any;
  evidences: any;
  sections: any;
  criteriaQuestions: any;
  myControl = new FormControl();
  filteredOptions: Observable<string[]>;

  toppings = new FormControl();
  constructor(
    private apiService: ApiService,
    public dialog: MatDialog,
    private _router: Router,
    private headerTextService: HeaderTextService
  ) {
    this.reset();
  }

  openDialog(result: any): void {
    let self = this;
    const dialogRef = this.dialog.open(DialogOverviewExampleDialog, {
      width: "75%",
      height: "80%",
      data: result.result,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      self.reset();
    });
  }
  reset() {
    let self = this;
    this.apiService
      .reqHandler("getCriteriaAndQuestion", undefined)
      .then(result => {
        self.criteriaQuestions = result;
        console.log(self.criteriaQuestions);
      });
    this.question = {
      question: ["", ""],
      tip: "",
      externalId:"",
      parentId:"",
      instanceParentId:"",
      options: [{ value: "", label: "" }],
      visibleIf: [{}],
      file: {
        required: false,
        type: ["image/jpeg"],
        minCount: 1,
        maxCount: 0,
        caption: false
      },
      responseType: "",
      validation: { required: true },
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
      payload: {
        criteriaId: "",
        evidenceId: "",
        section: ""
      }
    };
  }
  ngOnInit() {
    this.headerTextService.setHeader("Add Questions");

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

  transform(items: any[], field: string, value: string): any[] {
    if (!items) return [];
    return items.filter(it => it[field] == value);
  }

  searchCriteria(value) {
    console.log(value);
  }

  addOption() {
    this.question.options.push({ value: "", label: "" });
  }
  removeOption(i) {
    if (i > -1) {
      this.question.options.splice(i, 1);
    }
  }

  save(): void {
    this.question.file = this.question.file.required ? this.question.file : ""
    this.apiService
      .reqHandler("saveQuestion", this.question)
      .then(result => {
        console.log(result);

        this.openDialog(result);
      })
      .catch(error => {
        console.error(error);
      });
  }

  cancel(): void {
    this.reset();
  }

  questionType(type) {
    console.log(
      this.question.responseType,
      ["multiselect", "radio"].indexOf(this.question.responseType) > -1
    );

    if (type != "matrix") {
      delete this.question.instanceIdentifier;
      delete this.question.noOfInstances;
      delete this.question.notApplicable;
      delete this.question.instanceQuestions;

      if (["radio", "multiselect"].indexOf(type) == -1) {
        delete this.question.options;
      } else {
        this.question.options = [{ value: "", label: "" }];
      }
    } else {
      delete this.question.options;
    }
  }
}

@Component({
  selector: "question-dialog",
  templateUrl: "question-dialog.html",
  styleUrls: ["./question-dialog.scss"]
})
export class DialogOverviewExampleDialog implements OnInit {
  criteria: any;
  questions: any;
  isNumber: boolean;
  oldParent: string;
  typeList: string[] = ["image/jpeg"];

  // sections: any = [];

  ngOnInit(): void {
    // console.log(this.question, this.criteria);
  }

  constructor(
    public dialogRef: MatDialogRef<DialogOverviewExampleDialog>,
    @Inject(MAT_DIALOG_DATA) public question: any
  ) {
    console.log(this.question);
  }

  save(): void {
    alert("ID Copied");
    this.dialogRef.close(this.question);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
