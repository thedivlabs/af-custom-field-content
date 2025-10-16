import {
    __experimentalLinkControl as LinkControl,
    BlockControls,
} from "@wordpress/block-editor"
import {
    ToolbarGroup, DropdownMenu, MenuGroup, MenuItem,
} from "@wordpress/components";
import {useState} from '@wordpress/element';
import {customLink} from "@wordpress/icons";


export const Link = ({defaultValue, callback}) => {

    const [settings, setSettings] = useState(defaultValue || {});

    function updateSettings(newValue) {
        setSettings(newValue);
        callback(newValue);
    }

    return <BlockControls>
        <ToolbarGroup>
            <DropdownMenu
                icon={customLink}
                label={'Link'}
            >
                {({onClose}) => (
                    <MenuGroup>
                        <MenuItem>
                            <LinkControl
                                searchInputPlaceholder={"Search here..."}
                                allowDirectEntry={true}
                                forceIsEditingLink={true}
                                hasTextControl={true}
                                value={settings}
                                settings={[
                                    {
                                        id: 'linkNewTab',
                                        title: 'Open in new tab',
                                    }
                                ]}
                                onChange={(newValue) => updateSettings(newValue)}
                                withCreateSuggestion={true}
                            ></LinkControl>
                        </MenuItem>
                    </MenuGroup>
                )}
            </DropdownMenu>
        </ToolbarGroup>
    </BlockControls>;
}
