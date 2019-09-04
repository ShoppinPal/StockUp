import {Component, OnInit, Input, Output, EventEmitter} from '@angular/core';
import {ToastrService} from 'ngx-toastr';
import {OrgModelApi} from "../../../../../shared/lb-sdk/services/custom/OrgModel";
import {UserProfileService} from "../../../../../shared/services/user-profile.service";

@Component({
  selector: 'app-comments',
  templateUrl: 'comments.component.html',
  styleUrls: ['comments.component.scss']
})
export class CommentsComponent implements OnInit {

  public userProfile: any;
  public loading: boolean = false;
  private newComment: String;

  constructor(private toastr: ToastrService,
              private _userProfileService: UserProfileService,
              private orgModelApi: OrgModelApi) {
  }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
  }

  @Input() comments: Array<any>;
  @Input() stockOrderLineitemModelId: String;
  @Input() canAddComment: boolean;

  @Output() onCommentAdded = new EventEmitter<any>();


  addComment() {
    if (!this.newComment) {
      this.toastr.error('Please write a comment first');
    }
    else {
      this.loading = true;
      this.orgModelApi.createCommentModels(this.userProfile.orgModelId, {
        comment: this.newComment,
        userModelId: this.userProfile.userId,
        stockOrderLineitemModelId: this.stockOrderLineitemModelId
      })
        .subscribe(data => {
            this.loading = false;
            this.toastr.success('Comment added successfully');
            this.onCommentAdded.emit({
              comment: this.newComment,
              userModel: {
                name: this.userProfile.name
              },
              createdAt: new Date()
            });
            this.newComment = null;
          },
          error => {
            this.loading = false;
            this.toastr.error('Could not add comment');
            console.log(error);
          });
    }

  }

}
