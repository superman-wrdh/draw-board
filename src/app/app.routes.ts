import {Routes} from '@angular/router';
import {DrawBoardComponent} from "./draw-board/draw-board.component";


export const routes: Routes = [
  {
    path: '',
    redirectTo: '/draw',
    pathMatch: 'full',
  },
  {
    path: 'draw',
    component: DrawBoardComponent,
  },
];
