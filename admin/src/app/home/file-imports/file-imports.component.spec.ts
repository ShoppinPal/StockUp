import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FileImportsComponent } from './file-imports.component';

describe('FileImportsComponent', () => {
  let component: FileImportsComponent;
  let fixture: ComponentFixture<FileImportsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FileImportsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FileImportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
