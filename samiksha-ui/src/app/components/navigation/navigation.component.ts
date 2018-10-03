import { Component, OnInit } from "@angular/core";
import { AuthService } from "../../service/auth/auth.service";
import {
  BreakpointObserver,
  Breakpoints,
  BreakpointState
} from "@angular/cdk/layout";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

@Component({
  selector: "sl-navigation",
  templateUrl: "./navigation.component.html",
  styleUrls: ["./navigation.component.css"]
})
export class NavigationComponent implements OnInit {
  isHandset$: Observable<boolean> = this.breakpointObserver
    .observe(Breakpoints.Handset)
    .pipe(map(result => result.matches));

  public isAuthenticated: Boolean = false;

  constructor(
    private breakpointObserver: BreakpointObserver,
    private authService: AuthService
  ) {}

  ngOnInit() {
    let that = this;
    this.authService
      .validateApiToken()
      .then(result => {
        that.isAuthenticated = result;
      })
      .catch(console.error);

    // throw new Error("Method not implemented.");
  }

  login() {
    this.authService.doOAuthStepOne();
  }

  logout() {
    this.authService.doLogout();
  }
}
