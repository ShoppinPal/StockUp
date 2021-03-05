import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {BaseChartDirective, Label} from 'ng2-charts';
import {OrgModelApi} from '../../../../shared/lb-sdk';
import {UserProfileService} from '../../../../shared/services/user-profile.service';
import {ToastrService} from 'ngx-toastr';

@Component({
  selector: 'app-sales-graph',
  templateUrl: './sales-graph.component.html',
  styleUrls: ['./sales-graph.component.scss']
})
export class SalesGraphComponent implements OnInit {

  @Input() order;
  @Input() lineItem;

  public userProfile: any;
  public salesRangeDates = [];
  public lineChartData: Array<any> = [{
    data: [0, 0, 0, 0, 0, 0, 0],
    label: 'Sales History'
  }];
  public lineChartLabels: Array<Label>;
  public lineChartOptions: any = {
    responsive: true
  };
  public lineChartColours: Array<any> = [
    { // green
      backgroundColor: '#4dbd74b5',
      borderColor: '#4dbd74',
      pointBackgroundColor: 'rgba(148,159,177,1)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgba(148,159,177,0.8)'
    }
  ];
  public lineChartLegend = true;
  public lineChartType = 'line';
  public loadingGraph: boolean = false;
  public graphNumberOfDays: number = 7;
  @ViewChild(BaseChartDirective) chart: BaseChartDirective;

  constructor(
    private orgModelApi: OrgModelApi,
    private _userProfileService: UserProfileService,
    private toastr: ToastrService,
  ) { }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
  }


  changeGraphNumberOfDays(event, lineItem) {
    if (event.keyCode == '13') {
      this.fetchSalesHistory(lineItem)
    }
  }

  fetchSalesHistory(lineItem) {
    if (this.order.stockUpReorderPoints) {
      this.loadingGraph = true;
      // first decide no. of days to display in graph
      this.salesRangeDates = [];
      let millisecondsInDay = 24 * 60 * 60 * 1000;
      let orderCeatedAt:any = new Date(this.order.createdAt);
      for (let i = this.graphNumberOfDays - 1; i >= 0; i--) {
        let date = orderCeatedAt - (i * millisecondsInDay);
        this.salesRangeDates.push(new Date(date));
      }
      this.lineChartLabels = this.salesRangeDates.map(x => x.getUTCDate() + '/' + (x.getUTCMonth() + 1));

      // fetch data for the no. of days decided
      this.lineChartData[0].data.length = 0;
      let firstDateOfSaleInRange = new Date(orderCeatedAt - (this.graphNumberOfDays * millisecondsInDay));
      this.orgModelApi.getSalesLineItemsModels(this.userProfile.orgModelId, {
        where: {
          productModelId: lineItem.productModelId,
          salesDate: {
            gte: firstDateOfSaleInRange,
            lte: new Date(this.order.createdAt),
          },
          isReturnSale: 0,
          storeModelId: this.order.storeModelId
        },
        order: 'salesDate DESC',
      }).subscribe(result => {
          // if no sales data found for specified range, find the last-most sale
          if (!result.length) {
            this.orgModelApi.getSalesLineItemsModels(this.userProfile.orgModelId, {
              where: {
                productModelId: lineItem.productModelId,
                storeModelId: this.order.storeModelId,
                isReturnSale: 0
              },
              order: 'salesDate DESC',
              limit: 1
            })
              .subscribe(sale => {
                  if (sale.length) {
                    let salesDate = new Date(sale[0].salesDate);
                    let salesDateLabel = salesDate.getUTCDate() + '/' + (salesDate.getUTCMonth() + 1) + '/' + salesDate.getFullYear().toString().substr(-2);
                    // if dates displayed are more than normal, possibly because of last graph's
                    // last-most displayed sale, then replace that one with this, otherwise just add
                    // a new date label
                    if (this.lineChartLabels.length > this.graphNumberOfDays) {
                      this.lineChartLabels[0] = salesDateLabel;
                      this.salesRangeDates[0] = salesDate;
                    }
                    else {
                      this.lineChartLabels.unshift(salesDateLabel);
                      this.salesRangeDates.unshift(salesDate);
                    }
                    this.updateSalesGraph(sale);
                  }
                },
                err => {
                  console.log('error fetching sales data');
                  this.toastr.error('Error fetching sales data for ' + lineItem.productModelSku);
                });
          } else {
            this.updateSalesGraph(result);
          }
        },
        err => {
          console.log('error fetching sales data');
          this.toastr.error('Error fetching sales data for ' + lineItem.productModelSku);
        });
    }
  }

  updateSalesGraph(sales) {
    let perDateSales = [];
    this.loadingGraph = false;
    this.salesRangeDates.map((eachDate, index) => {
      let totalQuantities = 0;
      sales.map((eachSale) => {
        if (this.compareDateOfSales(eachDate, new Date(eachSale.salesDate))) {
          totalQuantities += eachSale.quantity;
        }
      });
      perDateSales.push(totalQuantities);
    });
    this.lineChartData[0].data = perDateSales;
    // timeout because updating chart data and updating the chart shouldn't be async
    setTimeout(() => {
      this.chart.update({
        duration: 800,
        easing: 'easeOutBounce'
      });
    }, 100);
  }

  compareDateOfSales(date1, date2) {
    if (date1.getDate() === date2.getDate()
      && date1.getMonth() === date2.getMonth()
      && date1.getFullYear() === date2.getFullYear()) {
      return true;
    }
    return false;
  }


}
