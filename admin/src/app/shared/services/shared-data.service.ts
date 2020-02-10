import { Injectable } from '@angular/core';

@Injectable()
export class SharedDataService {

  public isSmallDevice: boolean = false;

  constructor(
  ) { }

  setIsSmallDevice(data:boolean){
    this.isSmallDevice = data;
  }

  getIsSmallDevice() {
    return this.isSmallDevice;
  }


}
