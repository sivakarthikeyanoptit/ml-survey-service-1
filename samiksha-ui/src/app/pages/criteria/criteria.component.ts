import { Component, OnInit } from "@angular/core";

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

  constructor() {}

  submitCriteria() {
    this.criteria = {
      externalId: "TL/HM/HR/AL",
      owner: "a082787f-8f8f-42f2-a706-35457ca6f1fd",
      timesUsed: 12,
      weightage: 20,
      name: "Availability of leadership",
      description: "Availability of leadership",
      criteriaType: "manual",
      score: "L1/L2/L3/L4",
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
      createdFor: ["0125747659358699520", "0125748495625912324"],
      rubric: {},
      evidences: []
    };
    this.evidencesSelected = [];
    this.sectionsSelected = [];
    this.levelsSelected = [];

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
      this.criteria = {
        externalId: "TL/HM/HR/AL",
        owner: "a082787f-8f8f-42f2-a706-35457ca6f1fd",
        timesUsed: 12,
        weightage: 20,
        name: "Availability of leadership",
        description: "Availability of leadership",
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
        createdFor: ["0125747659358699520", "0125748495625912324"],
        rubric: {},
        evidences: []
      };
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
}
