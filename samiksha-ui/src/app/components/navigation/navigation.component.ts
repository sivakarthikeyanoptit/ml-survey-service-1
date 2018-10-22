import { Component, OnInit, OnDestroy } from "@angular/core";
import { AuthService } from "../../service/auth/auth.service";
import {
  BreakpointObserver,
  Breakpoints,
  BreakpointState
} from "@angular/cdk/layout";
import { Observable, Subject } from "rxjs";
import { map } from "rxjs/operators";
import { HeaderTextService } from "../../service/toolbar/header-text.service";

@Component({
  selector: "sl-navigation",
  templateUrl: "./navigation.component.html",
  styleUrls: ["./navigation.component.css"]
})
export class NavigationComponent implements OnInit, OnDestroy {
  isHandset$: Observable<boolean> = this.breakpointObserver
    .observe(Breakpoints.Handset)
    .pipe(map(result => result.matches));

  public isAuthenticated: Boolean = false;
  public navMenu: any;
  public headerText: string;
  subscription;

  constructor(
    private breakpointObserver: BreakpointObserver,
    private authService: AuthService,
    private headerTextService: HeaderTextService
  ) {
    this.navMenu = [
      // { label: "Add Criteria", url: "/assessment/web/criteria/new" },
      { label: "Criteria Details", url: "/assessment/web/criteria" },
      { label: "Questions", url: "/assessment/web/questions/new" }
    ];
  }
  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  ngOnInit() {
    let that = this;
    this.authService
      .validateApiToken()
      .then(result => {
        that.isAuthenticated = result;
      })
      .catch(console.error);

    // throw new Error("Method not implemented.");
    this.subscription = this.headerTextService.text.subscribe(value => {
      this.headerText = value;
    });
    this.headerTextService.setHeader("Samiksha");
  }

  login() {
    this.authService.doOAuthStepOne();
  }

  logout() {
    this.authService.doLogout();
  }
}
