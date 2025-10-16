import {__experimentalGrid as Grid, SelectControl} from "@wordpress/components";
import {InspectorControls} from "@wordpress/block-editor";

export const ELEMENT_TAG_OPTIONS = [
    {label: 'Default (<div>)', value: 'div'},
    {label: '<span>', value: 'span'},
];

export function ElementTag(settings) {

    return settings?.tag || 'div';
}

export const ElementTagControl = ({value, callback, args}) => {

    const {label} = args || {};

    return <InspectorControls group="advanced">
        <Grid columns={1} columnGap={15} rowGap={20} style={{paddingTop: '20px'}}>
            <SelectControl
                value={value}
                label={label || 'HTML element'}
                options={ELEMENT_TAG_OPTIONS}
                onChange={(newVal) => callback(newVal)}
                __next40pxDefaultSize
                __nextHasNoMarginBottom
            />
        </Grid>
    </InspectorControls>;
};