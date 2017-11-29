//https://stackoverflow.com/a/38308494/2186753
import {Directive, Input, ElementRef, Inject, HostListener} from '@angular/core';

@Directive({
  selector: '[appAutoFocus]'
})
export class AutoFocusDirective {

  @Input('appAutoFocus') appAutoFocus: boolean;

  constructor(@Inject(ElementRef) private element: ElementRef) {
  }

  protected ngAfterViewChecked() {
    if (this.appAutoFocus) {
      this.element.nativeElement.focus();
      this.element.nativeElement.setSelectionRange(0, this.element.nativeElement.value.length);
    }
  }
}
