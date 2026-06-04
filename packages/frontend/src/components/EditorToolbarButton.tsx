import { Button } from "@fluentui/react-components";

export interface EditorToolbarButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactElement;
  title: string;
}

export const EditorToolbarButton: React.FunctionComponent<EditorToolbarButtonProps> = ( props: EditorToolbarButtonProps) => {
  const { active, onClick, icon, title } = props;
  return (
    <Button
      appearance={active ? 'primary' : 'subtle'}
      size="small"
      icon={icon}
      title={title}
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
    />
  );
};