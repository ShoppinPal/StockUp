/**
 * https://coryrylan.com/blog/creating-a-custom-debounce-click-directive-in-angular
 */
import {Directive, EventEmitter, HostListener, OnDestroy, OnInit, Output, Input} from '@angular/core';
import {Subject, Subscription} from 'rxjs';
import {debounceTime} from 'rxjs/operators';

@Directive({
  selector: '[appDebounceKeyUp]'
})
export class DebounceKeyUpDirective implements OnInit, OnDestroy {
  @Input() debounceTime = 500;
  @Input() enabled = true;
  @Input() selectText = true;
  @Output('appDebounceKeyUp') debounceKeyUp = new EventEmitter();
  private keyUp = new Subject();
  private subscription: Subscription;
  constructor() { }

  ngOnInit() {
    this.subscription = this.keyUp.pipe(
        debounceTime(this.debounceTime)
    ).subscribe(e => this.debounceKeyUp.emit(e))
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  @HostListener('keyup', ['$event'])
  keyUpEvent(event) {
    event.stopPropagation();
    this.keyUp.next(event)
  }

  @HostListener('click', ['$event'])
  clickEvent(event) {
    if (this.selectText) {
      event.target.select();
    }
  }
}
