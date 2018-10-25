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
        this.addToCriteria(result);
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
    if (this.questionForm[i].parentId) {
      let parentId = this.questionForm[i].parentId;
      let childId = this.questionForm[i].externalId;
      let pIqF = this.questionForm.findIndex(function(ques) {
        return ques.externalId == parentId;
      });
      let pIc = this.criteria.evidences[
        this.questionForm[pIqF].evidenceIndex
      ].sections[this.questionForm[pIqF].sectionIndex].questions.findIndex(
        function(que) {
          return que.externalId == parentId;
        }
      );

      let qCi = this.criteria.evidences[
        this.questionForm[pIqF].evidenceIndex
      ].sections[this.questionForm[pIqF].sectionIndex].questions[
        pIqF
      ].children.indexOf(childId);

      this.criteria.evidences[this.questionForm[pIqF].evidenceIndex].sections[
        this.questionForm[pIqF].sectionIndex
      ].questions[pIqF].children.splice(qCi, 1);

      let qQfI = this.questionForm[pIqF].children.indexOf(childId);

      let cCi = this.criteria.evidences[
        this.questionForm[i].evidenceIndex
      ].sections[this.questionForm[i].sectionIndex].questions.findIndex(
        function(que) {
          return que.externalId == childId;
        }
      );
      this.questionForm[pIqF].children.splice(qQfI, 1);
      this.criteria.evidences[this.questionForm[i].evidenceIndex].sections[
        this.questionForm[i].sectionIndex
      ].questions.splice(cCi, 1);
      this.questionForm.splice(i, 1);

      localStorage.setItem("questions", JSON.stringify(this.questionForm));
      localStorage.setItem("criteria", JSON.stringify(this.criteria));
      window.location.reload();
    } else {
      this.questionForm.splice(i, 1);
      localStorage.setItem("questions", JSON.stringify(this.questionForm));
      window.location.reload();
    }
  }

  addToCriteria(question) {
    console.log(question);

    if (question.evidenceIndex > -1 && question.sectionIndex > -1) {
      let quesValues = [],
        values = {
          evidenceIndex: question.evidenceIndex,
          sectionIndex: question.sectionIndex,
          oldParent: question.oldParent
        },
        qId = this.criteria.evidences[question.evidenceIndex].sections[
          question.sectionIndex
        ].questions.findIndex(function(que) {
          return que.externalId == question.externalId;
        }),
        qfId = this.questionForm.findIndex(function(ques) {
          return question.externalId == ques.externalId;
        }),
        pqfId = this.questionForm.findIndex(function(ques) {
          return question.parentId == ques.externalId;
        }),
        opqfId = this.questionForm.findIndex(function(ques) {
          return question.oldParent == ques.externalId;
        });

      console.log(
        qfId,
        "----opqfId----->",
        opqfId,
        "----pqfId----->",
        pqfId,
        "----values.oldParent----->",
        values.oldParent,
        "----pQF----->",
        this.questionForm[pqfId]
      );
      // "----QC----->",
      // this.criteria.evidences[this.questionForm[pqfId].evidenceIndex].sections[
      //   this.questionForm[pqfId].sectionIndex
      // ].questions[pqId]

      if (
        typeof values.oldParent == "undefined" &&
        typeof question.parentId == "undefined"
      ) {
        console.log("Parent not added");
      } else if (question.parentId == values.oldParent) {
        // question.visibleIf.externalId = question.parentId;

        console.log("Same to same");
      } else if (typeof values.oldParent == "undefined") {
        question.visibleIf[0].externalId = question.parentId;

        let pqId = this.criteria.evidences[
          this.questionForm[pqfId] ? this.questionForm[pqfId].evidenceIndex : -1
        ].sections[this.questionForm[pqfId].sectionIndex].questions.findIndex(
          function(que) {
            return que.externalId == question.parentId;
          }
        );
        console.log(
          "----qId----->",
          qId,
          "----pqId----->",
          pqId,
          "----opqId----->"
        );

        console.log(
          "Parent added",
          question.parentId,
          this.questionForm[pqfId]
        );
        console.log(
          "--im parent-->",
          this.criteria.evidences[this.questionForm[pqfId].evidenceIndex]
            .sections[this.questionForm[pqfId].sectionIndex]
        );
        this.criteria.evidences[
          this.questionForm[pqfId].evidenceIndex
        ].sections[this.questionForm[pqfId].sectionIndex].questions[
          pqId
        ].children.push(question.externalId + "");
        this.questionForm[pqfId].children.push(question.externalId + "");
        console.log(pqfId, this.questionForm[pqfId]);
      } else if (question.parentId != values.oldParent) {
        let cI = this.questionForm[opqfId].children.indexOf(
            question.externalId + ""
          ),
          pqId = this.criteria.evidences[
            this.questionForm[pqfId]
              ? this.questionForm[pqfId].evidenceIndex
              : -1
          ].sections[this.questionForm[pqfId].sectionIndex].questions.findIndex(
            function(que) {
              return que.externalId == question.parentId;
            }
          ),
          opqId = this.criteria.evidences[
            this.questionForm[opqfId].evidenceIndex
          ].sections[
            this.questionForm[opqfId].sectionIndex
          ].questions.findIndex(function(que) {
            return que.externalId == question.oldParent;
          });
        console.log(
          "----qId----->",
          qId,
          "----pqId----->",
          pqId,
          "----opqId----->",
          opqId,
          "----qfId----->"
        );

        console.log(
          "Parent changed",
          values.oldParent,
          "---->",
          question.parentId,
          cI
        );
        question.visibleIf[0].externalId = question.parentId;
        delete this.criteria.evidences[this.questionForm[opqfId].evidenceIndex]
          .sections[this.questionForm[opqfId].sectionIndex].questions[opqfId]
          .children[cI];
        delete this.questionForm[opqfId].children[cI];

        this.criteria.evidences[
          this.questionForm[pqfId].evidenceIndex
        ].sections[this.questionForm[pqfId].sectionIndex].questions[
          pqId
        ].children.push(question.externalId + "");
        this.questionForm[pqfId].children.push(question.externalId + "");
        console.log(pqfId, this.questionForm[pqfId]);
      }

      console.log(this.criteria);
      console.log(this.questionForm);

      localStorage.setItem("questions", JSON.stringify(this.questionForm));

      delete question.evidenceIndex;
      delete question.sectionIndex;
      delete question.evidenceName;
      delete question.sectionName;
      delete question.sections;
      delete question.oldParent;

      // if(question.questionType =! 'matrix')

      question.questions.forEach(obj => {
        quesValues.push(obj.value);
      });
      question.question = quesValues;
      delete question.questions;

      if (qId > -1) {
        this.criteria.evidences[values.evidenceIndex].sections[
          values.sectionIndex
        ].questions[qId] = question;
      } else {
        this.criteria.evidences[values.evidenceIndex].sections[
          values.sectionIndex
        ].questions.push(question);
      }

      localStorage.setItem("criteria", JSON.stringify(this.criteria));

      window.location.reload();
    }
  }

  addQuestion() {
    this.questionForm.push({
      questions: [{ value: "" }],
      options: [{ value: "", label: "" }],
      visibleIf: [{}],
      file: {
        required: false,
        type: [],
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
      accessibility: "local"
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
    this.question.oldParent = this.question.parentId;
    this.questions = JSON.parse(localStorage.getItem("questions"));
    this.criteria = JSON.parse(localStorage.getItem("criteria"));
    // console.log("oldParent--->", this.oldParent);
  }

  addQuestion() {
    this.question.questions.push({ value: "" });
  }
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
    }
  }
}
