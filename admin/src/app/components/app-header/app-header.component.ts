import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './app-header.component.html'
})
export class AppHeaderComponent implements OnInit {

  public user: any;

  constructor(private _route: ActivatedRoute) {
  }

  ngOnInit() {
    this.getRouteData()
  }

  getRouteData() {
    this._route.data.subscribe((data: any) => {
        this.user = data.user;
      },
      (error) => {
        console.log('error in fetching user data', error);
      });
  }

}
