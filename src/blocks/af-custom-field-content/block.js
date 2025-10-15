import {
    useBlockProps,
    InspectorControls,
} from "@wordpress/block-editor"
import {registerBlockType} from "@wordpress/blocks"
import metadata from "./block.json"
import {ElementTagSettings, ElementTag, ELEMENT_TAG_ATTRIBUTES} from "Components/ElementTag";
import {
    __experimentalGrid as Grid,
    PanelBody, ComboboxControl, SelectControl,
} from "@wordpress/components";
import {withStyle, withStyleSave, STYLE_ATTRIBUTES} from "Components/Style.js";
import {useState, useEffect, useMemo, useCallback} from '@wordpress/element';
import {useSelect} from '@wordpress/data';
import apiFetch from '@wordpress/api-fetch';
import {dateI18n} from '@wordpress/date';


const selector = 'wpbs-acf-field-content';

const classNames = (attributes = {}, editor = false) => {

    const {'wpbs-acf-field-content': settings} = attributes;

    return [
        selector,
        ' w-full block relative',
    ].filter(x => x).join(' ');
}

function flattenACF(obj, prefix = '') {
    let result = {};

    Object.entries(obj || {}).forEach(([key, val]) => {
        const path = prefix ? `${prefix}.${key}` : key;

        if (typeof val === 'string') {
            const trimmed = val.trim();
            if (trimmed.length > 0) {
                result[path] = trimmed;
            }
        } else if (Array.isArray(val)) {
            // skip arrays (repeaters/media IDs)
            return;
        } else if (val && typeof val === 'object') {
            Object.assign(result, flattenACF(val, path));
        }
    });

    return result;
}

registerBlockType(metadata.name, {
    apiVersion: 3,
    attributes: {
        ...metadata.attributes,
        ...STYLE_ATTRIBUTES,
        ...ELEMENT_TAG_ATTRIBUTES,
        'wpbs-acf-field-content': {
            type: 'object'
        }
    },
    edit: withStyle(({attributes, setAttributes, clientId, setStyle, styleClassNames}) => {

        const {'wpbs-acf-field-content': settings = {}} = attributes;

        const {field = ''} = settings;

        const postId = useSelect(
            (select) => select('core/editor').getCurrentPostId(),
            []
        );
        const postType = useSelect(
            (select) => select('core/editor').getCurrentPostType(),
            []
        );

        const [fieldMap, setFieldMap] = useState({});
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState(null);

        useEffect(() => {
            if (!postId || !postType) return;

            setLoading(true);
            setError(null);

            apiFetch({path: `/wp/v2/${postType}/${postId}`})
                .then((post) => {
                    if (post.acf && typeof post.acf === 'object') {
                        const flat = flattenACF(post?.acf?.wpbs ?? {});
                        setFieldMap(flat);
                    } else {
                        setFieldMap({});
                    }
                })
                .catch((err) => {
                    console.error('Error fetching ACF fields:', err);
                    setError('Unable to fetch ACF fields for this post.');
                })
                .finally(() => {
                    setLoading(false);
                });
        }, [postId, postType]);

        const options = useMemo(
            () => Object.keys(fieldMap).map((s) => ({label: s, value: s})),
            [fieldMap]
        );

        const updateSettings = useCallback(
            (newValue) => {
                const result = {
                    ...(attributes?.['wpbs-acf-field-content'] ?? {}),
                    ...newValue,
                };
                setAttributes({'wpbs-acf-field-content': result});
            },
            [attributes, setAttributes]
        );

        const blockProps = useBlockProps({
            className: styleClassNames(classNames(attributes, true))
        });

        const ElementTagName = ElementTag(attributes);

        return <>


            <ElementTagSettings attributes={attributes} setAttributes={setAttributes}/>
            <InspectorControls group="styles">
                <PanelBody initialOpen={true}>
                    <Grid columns={1} columnGap={15} rowGap={20} style={{paddingTop: '20px'}}>
                        <ComboboxControl
                            label="Select ACF Field"
                            value={field}
                            options={options}
                            onChange={(newVal) => updateSettings({field: newVal})}
                            allowReset
                            __next40pxDefaultSize
                            __nextHasNoMarginBottom
                        />
                        <SelectControl
                            label="Date Format"
                            value={settings.dateFormat ?? 'Y-m-d'}
                            options={[
                                {label: 'YYYY-MM-DD', value: 'Y-m-d'},
                                {label: 'MM/DD/YYYY', value: 'm/d/Y'},
                                {label: 'Month DD, YYYY', value: 'F j, Y'},
                                {label: 'DD.MM.YYYY', value: 'd.m.Y'},
                            ]}
                            onChange={(newVal) => updateSettings({dateFormat: newVal})}
                            __next40pxDefaultSize
                            __nextHasNoMarginBottom
                        />
                    </Grid>
                </PanelBody>
            </InspectorControls>
            <ElementTagName {...blockProps} >
                {field && fieldMap[field]
                    ? (settings.dateFormat
                        ? dateI18n(settings.dateFormat, fieldMap[field])
                        : fieldMap[field])
                    : 'ACF Content'}
            </ElementTagName>

        </>
    }),
    save: withStyleSave((props) => {
        const {attributes, styleClassNames} = props;

        const {'wpbs-acf-field-content': settings = {}} = attributes;

        const blockProps = useBlockProps.save({
            className: styleClassNames(classNames(attributes)),
            ...(props.attributes?.['wpbs-props'] ?? {})
        });

        const ElementTagName = ElementTag(attributes);

        return <ElementTagName {...blockProps} >{'__FIELD_CONTENT__'}</ElementTagName>
    })
})


