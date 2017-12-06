import {Component} from '@angular/core';
import {LoopBackConfig} from './shared/lb-sdk';
import {environment} from '../environments/environment.prod';


@Component({
  // tslint:disable-next-line
  selector: 'body',
  template: '<router-outlet></router-outlet>'
})
export class AppComponent {
  constructor() {
    LoopBackConfig.setBaseURL(environment.BASE_URL);
    LoopBackConfig.setApiVersion(environment.API_VERSION);
  }
}
