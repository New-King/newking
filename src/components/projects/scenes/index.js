import TerminalScene from './TerminalScene';
import ChatScene from './ChatScene';
import FormScene from './FormScene';
import ListScene from './ListScene';
import CanvasScene from './CanvasScene';
import TransferScene from './TransferScene';

// 场景模板注册表：新增场景 = 新建组件 + 在此注册
const SCENES = {
  terminal: TerminalScene,
  chat: ChatScene,
  form: FormScene,
  list: ListScene,
  canvas: CanvasScene,
  transfer: TransferScene,
};

export default SCENES;
