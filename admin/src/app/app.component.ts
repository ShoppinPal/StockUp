import {Component} from '@angular/core';
import {LoopBackConfig} from './shared/lb-sdk';
import {BASE_URL, API_VERSION} from './shared/base.url';


@Component({
  // tslint:disable-next-line
  selector: 'body',
  template: '<router-outlet></router-outlet>'
})
export class AppComponent {
  constructor() {
    LoopBackConfig.setBaseURL(BASE_URL);
    LoopBackConfig.setApiVersion(API_VERSION);
  }
}
