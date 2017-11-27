//https://stackoverflow.com/a/38308494/2186753
import {Directive, Input, ElementRef, Inject} from '@angular/core';

@Directive({
  selector: '[autoFocus]'
})
export class AutoFocusDirective {

  @Input()
  focus: boolean;

  constructor(@Inject(ElementRef) private element: ElementRef) {
  }

  protected ngOnChanges() {
      this.element.nativeElement.focus();
  }

}
