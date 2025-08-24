import { VscClose } from 'react-icons/vsc';
import '../../components/editor/editor.css';

export default function EditorTabs({ openFiles, activeFile, onTabClick, onTabClose, getTabKey }) {
  return (
    <div className="vscode-tabs">
      {openFiles.map(file => (
        <div
          key={getTabKey ? getTabKey(file) : file._id}
          className={`vscode-tab${activeFile && (getTabKey ? getTabKey(file) === getTabKey(activeFile) : file._id === activeFile._id) ? ' active' : ''}`}
          onClick={() => onTabClick(file)}
        >
          <span className="vscode-tab-filename">{file.name}</span>
          <span className="vscode-tab-close" onClick={e => { e.stopPropagation(); onTabClose(file._id, file.folder?._id || file.folder || 'root'); }}><VscClose /></span>
        </div>
      ))}
    </div>
  );
} 