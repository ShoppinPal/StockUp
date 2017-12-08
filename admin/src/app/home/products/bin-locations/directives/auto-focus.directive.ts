//https://stackoverflow.com/a/38308494/2186753
import {Directive, Input, ElementRef, Inject, ChangeDetectorRef} from '@angular/core';

@Directive({
  selector: '[appAutoFocus]'
})
export class AutoFocusDirective {

  @Input('appAutoFocus') appAutoFocus: boolean;
  @Input('ngModel') ngModel: string;

  constructor(private element: ElementRef,
              private cdRef: ChangeDetectorRef) {
  }

  protected ngAfterViewChecked() {
    if (this.appAutoFocus) {
      this.element.nativeElement.focus();
      this.appAutoFocus = false;
      if (this.ngModel) {
        setTimeout(() => { //it takes time for mobile browsers to detect the pre-set values of ngModel
          this.element.nativeElement.setSelectionRange(0, this.ngModel.length);
        }, 500);
      }
      this.cdRef.detectChanges(); //https://stackoverflow.com/questions/39787038/how-to-manage-angular2-expression-has-changed-after-it-was-checked-exception-w
    }
  }
}
