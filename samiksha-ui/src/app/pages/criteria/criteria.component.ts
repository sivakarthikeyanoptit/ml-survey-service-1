import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../service/api/api.service";

@Component({
  selector: "sl-criteria",
  templateUrl: "./criteria.component.html",
  styleUrls: ["./criteria.component.scss"]
})
export class CriteriaComponent implements OnInit {
  evidencesSelected: string[];
  sectionsSelected: any = {};
  levelsSelected: string[];
  evidences: any[];
  sections: any[];
  levels: any;
  criteria: any;

  constructor(private api: ApiService) {}

  submitCriteria() {
    let self = this;
    this.api
      .reqHandler(
        "createCriteria",
        JSON.parse(localStorage.getItem("criteria"))
      )
      .then((result: any) => {
        if (result.status == 200) {
          self.resetCriteria();
          self.evidencesSelected = [];
          self.sectionsSelected = [];
          self.levelsSelected = [];
        }
      });

    console.log("Criteria submitted");
  }

  pushEvidence(obj) {
    console.log(typeof obj, obj);
    this.criteria.evidences = [];
    obj.forEach(i => {
      this.criteria.evidences.push(this.evidences[i]);
    });
  }

  pushEvidenceSections(ei, obj) {
    console.log(typeof obj, ei, obj);
    this.criteria.evidences[ei].sections = [];
    obj.forEach(i => {
      this.criteria.evidences[ei].sections.push(this.sections[i]);
    });
  }

  saveCriteria() {
    this.criteria.rubric.name = this.criteria.name;
    this.criteria.rubric.description = this.criteria.description;
    this.criteria.rubric.type = this.criteria.criteriaType;

    localStorage.setItem("criteria", JSON.stringify(this.criteria));
    localStorage.setItem(
      "evidencesSelected",
      JSON.stringify(this.evidencesSelected)
    );
    localStorage.setItem(
      "sectionsSelected",
      JSON.stringify(this.sectionsSelected)
    );
    localStorage.setItem("levelsSelected", JSON.stringify(this.levelsSelected));

    alert("Criteria Saved");
  }

  pushLevels(obj) {
    console.log(typeof obj, obj);
    this.criteria.rubric.levels = [];
    obj.forEach(i => {
      this.criteria.rubric.levels.push(this.levels[i]);
    });
  }

  ngOnInit() {
    let data = localStorage.getItem("criteria");
    if (data) {
      this.criteria = JSON.parse(data);
      this.evidencesSelected =
        JSON.parse(localStorage.getItem("evidencesSelected")) || [];
      this.sectionsSelected =
        JSON.parse(localStorage.getItem("sectionsSelected")) || {};
      this.levelsSelected =
        JSON.parse(localStorage.getItem("levelsSelected")) || [];
    } else {
      this.resetCriteria();
    }

    this.levels = [
      {
        level: "L4",
        label: "Level 4",
        description:
          "School has a full-time principal and vice principal as per norms (if applicable)",
        expression: "",
        expressionVariables: []
      },
      {
        level: "L3",
        label: "Level 3",
        description:
          "School has full time principal but vice principal is not present / or is inadequate",
        expression: "",
        expressionVariables: []
      },
      {
        level: "L2",
        label: "Level 2",
        description:
          "The school principal or vice-principal (one of the two) is available part time.",
        expression: "",
        expressionVariables: []
      },
      {
        level: "L1",
        label: "Level 1",
        description:
          "School does not have a principal or vice-principal; there is  a teacher in-charge of the post",
        expression: "",
        expressionVariables: []
      }
    ];
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
        externalId: "PI",
        tip: "Some tip at evidence level.",
        name: "Principal interview",
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
      {
        name: "Survey Questions",
        questions: []
      },
      {
        name: "Data to be Filled",
        questions: []
      }
    ];
  }

  resetCriteria() {
    this.criteria = {
      externalId: "TL/HM/HR/AL",
      owner: "",
      timesUsed: 12,
      weightage: 20,
      remarks: "",
      name: "",
      description: "",
      criteriaType: "manual",
      score: "",
      resourceType: ["Program", "Framework", "Criteria"],
      language: ["English"],
      keywords: ["Keyword 1", "Keyword 2"],
      concepts: [
        {
          identifier: "LPD20100",
          name: "Teacher_Performance",
          objectType: "Concept",
          relation: "associatedTo",
          description: null,
          index: null,
          status: null,
          depth: null,
          mimeType: null,
          visibility: null,
          compatibilityLevel: null
        },
        {
          identifier: "LPD20400",
          name: "Instructional_Programme",
          objectType: "Concept",
          relation: "associatedTo",
          description: null,
          index: null,
          status: null,
          depth: null,
          mimeType: null,
          visibility: null,
          compatibilityLevel: null
        },
        {
          identifier: "LPD20200",
          name: "Teacher_Empowerment",
          objectType: "Concept",
          relation: "associatedTo",
          description: null,
          index: null,
          status: null,
          depth: null,
          mimeType: null,
          visibility: null,
          compatibilityLevel: null
        }
      ],
      flag: {
        label: "I have a problem with :-",
        remarks: "",
        value: "",
        options: [
          {
            value: "R1",
            label: "Criteria rating of multiple questions"
          },
          {
            value: "R2",
            label: "Criteria rating of one question only"
          }
        ]
      },
      createdFor: ["0125747659358699520", "0125748495625912324"],
      rubric: {},
      evidences: []
    };
  }
}
