import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild} from '@angular/core';
import {BsModalRef, BsModalService} from "ngx-bootstrap";

@Component({
  selector: 'app-confirm-modal',
  templateUrl: './confirm-modal.component.html',
  styleUrls: ['./confirm-modal.component.scss']
})
export class ConfirmModalComponent implements OnInit {
  public modalRef: BsModalRef;
  @ViewChild('modelTemplate') modelEl;

  @Output() confirm = new EventEmitter();
  @Output() cancel = new EventEmitter();
  @Input() message = 'Are you sure ?';
  @Input()
  public set show(val: boolean) {
    if (val) {
      this.showModal();
    } else {
      this.hideModal();
    }
  }
  @Output() showChange = new EventEmitter();
  constructor(private modalService: BsModalService) { }

  ngOnInit() {
  }

  showModal() {
    this.modalRef = this.modalService.show(this.modelEl, {class: 'modal-sm'});
  }

  successHandler() {
    this.hideModal();
      this.confirm.emit();
  }

  cancelHandler() {
    this.hideModal();
    this.cancel.emit();
  }

  hideModal() {
    if (this.modalRef) {
      this.modalRef.hide();
    }
    this.showChange.emit(false);
  }
}
