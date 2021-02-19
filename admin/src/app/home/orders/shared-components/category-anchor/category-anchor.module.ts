import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryAnchorComponent } from './category-anchor.component';

@NgModule({
    declarations: [CategoryAnchorComponent],
    exports: [
        CategoryAnchorComponent
    ],
    imports: [
        CommonModule
    ]
})
export class CategoryAnchorModule { }
