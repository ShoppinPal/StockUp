import {Component, OnInit} from '@angular/core';
import {BsModalRef} from "ngx-bootstrap";
import {ToastrService} from "ngx-toastr";

@Component({
  selector: 'app-delete-order',
  templateUrl: './delete-order.component.html',
  styleUrls: ['./delete-order.component.scss']
})
export class DeleteOrderComponent implements OnInit {

  constructor(public bsModalRef: BsModalRef,
              private toastr: ToastrService) {
  }

  ngOnInit() {
  }

  deleteStockOrder() {
    this.toastr.success('Deleted order successfully');
    this.bsModalRef.hide();
  }

}
