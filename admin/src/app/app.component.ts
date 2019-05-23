import {Component} from '@angular/core';
import {LoopBackConfig} from './shared/lb-sdk';
import {environment} from '../environments/environment';
import { Router, NavigationEnd } from '@angular/router';


@Component({
  // tslint:disable-next-line
  selector: 'body',
  template: '<router-outlet></router-outlet>'
})
export class AppComponent {
  constructor(private router: Router) {
    LoopBackConfig.setBaseURL(environment.BASE_URL);
    LoopBackConfig.setApiVersion(environment.API_VERSION);
  }

  ngOnInit() {
    this.router.events.subscribe((evt) => {
      if (!(evt instanceof NavigationEnd)) {
        return;
      }
      window.scrollTo(0, 0);
    });
  }
}
