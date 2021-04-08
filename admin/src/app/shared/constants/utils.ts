export default class Utils {

  static maxLengthForPassword = 6;

  static validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (email instanceof Array) {
      let valid: boolean = true;
      email.forEach(mail => {
        if (mail) {
          valid = re.test(String(mail.trim()).toLowerCase())
        }
      });
      return valid;
    } else {
      return re.test(String(email).toLowerCase());
    }
  }

  static validatePassword(password) {
    var re = new RegExp(`^.{${this.maxLengthForPassword},}$`);
    return re.test(String(password));
  }

  /**
   * getDiscrepancyReason
   *     F   R   Discrepancy   Damaged
   * (1) 10  15  OD(5/15)       0
   * (2) 10  8   Missing(2/10)  0
   *
   * (3) 10  15  OD(5/15)       2     - 5 Over Received and 2 more received but damaged
   * (4) 10  8   Missing(1/10)  1/10  - Underdelivered with 1 missing & 1 Damaged
   * (5) 10  8   -              3     - originally OverDelivered but damaged in shipping
   * @param lineItem - List Item
   */
  static getDiscrepancyReason(lineItem: any) {
    // Damaged qty or 0
    const damagedQuantity = (lineItem.damagedQuantity || 0);
    const realDiffInQty = lineItem.fulfilledQuantity - lineItem.receivedQuantity;
    const reason = [];

    // No Discrepancy Case
    if (lineItem.fulfilledQuantity === lineItem.receivedQuantity && damagedQuantity === 0) {
      return [];
    }

    // Original Difference - Damaged Qty Reported - used to check for Case (5)
    const discrepancyQty = Math.abs(realDiffInQty) - damagedQuantity;
    // OverDelivered case (1) & (3)
    if (lineItem.fulfilledQuantity < lineItem.receivedQuantity) {
      reason.push(`Over Delivered(${Math.abs(realDiffInQty)}/${lineItem.receivedQuantity})`);
      if (damagedQuantity) {
        reason.push(`Damaged(${damagedQuantity})`);
      }
      // Underdelivered case (2) & (4)
    } else if (lineItem.fulfilledQuantity > lineItem.receivedQuantity && discrepancyQty >= 0) {
      // Dont show if Missing 0
      if (discrepancyQty) {
        reason.push(`Missing(${discrepancyQty}/${lineItem.fulfilledQuantity})`);
      }
      if (damagedQuantity) {
        reason.push(`Damaged(${damagedQuantity}/${lineItem.fulfilledQuantity})`);
      }
      // Case(5)
    } else {
      if (damagedQuantity) {
        reason.push(`Damaged(${damagedQuantity})`);
      }
    }
    return reason;
  }

}
