import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DrawBoardComponent } from './draw-board.component';

describe('DrawBoardComponent', () => {
  let component: DrawBoardComponent;
  let fixture: ComponentFixture<DrawBoardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DrawBoardComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DrawBoardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
