import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
// import { Config } from "../index";

@Injectable({
  providedIn: "root"
})
export class QuestionsService {
  private options: any = {
    headers: {
      "x-authenticated-user-token":
        "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJwZU9VQ3ZTVUR2ekprYzlyeXJVNTNWLXV6ME1nOFVCbk4tSzJfTmFpX2N3In0.eyJqdGkiOiIxMjc2NDg1Ny1jYjU0LTQyNTQtOWI0MC02NThhZDM3YzhkNGEiLCJleHAiOjE1Mzg0MjE1NDksIm5iZiI6MCwiaWF0IjoxNTM4Mzk5OTQ5LCJpc3MiOiJodHRwczovL2Rldi5zaGlrc2hhbG9rYW0ub3JnL2F1dGgvcmVhbG1zL3N1bmJpcmQiLCJhdWQiOiJhZG1pbi1jbGkiLCJzdWIiOiJjYWUwMTY4Ni00YmZmLTQ3MmMtOTc4MS0zZTczMjFhMzc4ZTQiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJhZG1pbi1jbGkiLCJhdXRoX3RpbWUiOjAsInNlc3Npb25fc3RhdGUiOiIxNTI0NjgwNS00NWNjLTRjZTctOTc1My05M2M2YWZmZjA0OGIiLCJhY3IiOiIxIiwiYWxsb3dlZC1vcmlnaW5zIjpbXSwicmVzb3VyY2VfYWNjZXNzIjp7fSwibmFtZSI6IkRDUENSIEFzc2Vzc29yMSIsInByZWZlcnJlZF91c2VybmFtZSI6ImFzMUBzaGlrc2hhbG9rYW1kZXYiLCJnaXZlbl9uYW1lIjoiRENQQ1IiLCJmYW1pbHlfbmFtZSI6IkFzc2Vzc29yMSIsImVtYWlsIjoiYTFAc2hpa3NoYWxva2FtLmRldiJ9.idxqfAockZlGH5YX0OtHHWwcn1IsZ9h1G5QfBN721Ch6AfJhpA8PihprNSdE91WnVJs1yJOSpL264J_aeDPqmc90Fn-rOILPiugUutUPKBybuX9qASGXvXKoFYrq0N7is0D7XgsISYZs5T836Ws42q12_0e5k5VlNIdt8fV0meCkrprMejFmT_yfZhKdC-1njaIB5IJUmwSGznQS2i1B0lstDI5abX7iVd8Y8D5XxNC-3PbJByHzsgOCP3JXbaqIdOhT18tq3hrPy6-t629BemKRJgnYDPZvAzvpRm78a2pTqMe55dxCcXkbl1QpdNkGJRuOMcV7kToQaBt8fEE7Uw"
    }
  };
  constructor(
    private http: HttpClient,
    // private headers: HttpHeaders,
    private _router: Router // private config: Config
  ) {
    // this.headers.append(
    //   "token",
    //   "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJwZU9VQ3ZTVUR2ekprYzlyeXJVNTNWLXV6ME1nOFVCbk4tSzJfTmFpX2N3In0.eyJqdGkiOiIxMjc2NDg1Ny1jYjU0LTQyNTQtOWI0MC02NThhZDM3YzhkNGEiLCJleHAiOjE1Mzg0MjE1NDksIm5iZiI6MCwiaWF0IjoxNTM4Mzk5OTQ5LCJpc3MiOiJodHRwczovL2Rldi5zaGlrc2hhbG9rYW0ub3JnL2F1dGgvcmVhbG1zL3N1bmJpcmQiLCJhdWQiOiJhZG1pbi1jbGkiLCJzdWIiOiJjYWUwMTY4Ni00YmZmLTQ3MmMtOTc4MS0zZTczMjFhMzc4ZTQiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJhZG1pbi1jbGkiLCJhdXRoX3RpbWUiOjAsInNlc3Npb25fc3RhdGUiOiIxNTI0NjgwNS00NWNjLTRjZTctOTc1My05M2M2YWZmZjA0OGIiLCJhY3IiOiIxIiwiYWxsb3dlZC1vcmlnaW5zIjpbXSwicmVzb3VyY2VfYWNjZXNzIjp7fSwibmFtZSI6IkRDUENSIEFzc2Vzc29yMSIsInByZWZlcnJlZF91c2VybmFtZSI6ImFzMUBzaGlrc2hhbG9rYW1kZXYiLCJnaXZlbl9uYW1lIjoiRENQQ1IiLCJmYW1pbHlfbmFtZSI6IkFzc2Vzc29yMSIsImVtYWlsIjoiYTFAc2hpa3NoYWxva2FtLmRldiJ9.idxqfAockZlGH5YX0OtHHWwcn1IsZ9h1G5QfBN721Ch6AfJhpA8PihprNSdE91WnVJs1yJOSpL264J_aeDPqmc90Fn-rOILPiugUutUPKBybuX9qASGXvXKoFYrq0N7is0D7XgsISYZs5T836Ws42q12_0e5k5VlNIdt8fV0meCkrprMejFmT_yfZhKdC-1njaIB5IJUmwSGznQS2i1B0lstDI5abX7iVd8Y8D5XxNC-3PbJByHzsgOCP3JXbaqIdOhT18tq3hrPy6-t629BemKRJgnYDPZvAzvpRm78a2pTqMe55dxCcXkbl1QpdNkGJRuOMcV7kToQaBt8fEE7Uw"
    // );
    console.log("I am service");
  }

  REST(type, url, data) {
    var self = this;
    return new Promise((resolve, reject) => {
      self.http[type](url, data, this.options).subscribe(
        result => {
          resolve(result);
        },
        error => {
          var error_obj = error.error;
          // if (error_obj.code == "1016") {
          //   this._router.navigate(["/login"]);
          // } else {
          reject(error_obj);
          // }
        }
      );
    });
  }
}
