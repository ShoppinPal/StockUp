import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FileImportsDetailsComponent } from './file-imports-details.component';

describe('FileImportsDetailsComponent', () => {
  let component: FileImportsDetailsComponent;
  let fixture: ComponentFixture<FileImportsDetailsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FileImportsDetailsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FileImportsDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
