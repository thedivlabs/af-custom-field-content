import {
    useBlockProps,
    InspectorControls,
} from "@wordpress/block-editor"
import {registerBlockType} from "@wordpress/blocks"
import metadata from "./block.json"
import {
    __experimentalGrid as Grid,
    PanelBody, ComboboxControl, SelectControl,
} from "@wordpress/components";
import {useState, useEffect, useMemo, useCallback} from '@wordpress/element';
import {useSelect} from '@wordpress/data';
import apiFetch from '@wordpress/api-fetch';
import {dateI18n} from '@wordpress/date';
import './style.scss';


const selector = 'af-acf-field-content';

const classNames = (attributes = {}) => {
    const {'af-acf-field-content': settings} = attributes;
    return [
        selector,
    ].filter(x => x).join(' ');
}

export const ELEMENT_TAG_OPTIONS = [
    {label: 'Default (<div>)', value: 'div'},
    {label: '<span>', value: 'span'},
];

function ElementTag(settings) {
    return settings?.tag || 'div';
}

function flattenACF(obj, meta = {}, prefix = '') {
    let result = {};

    Object.entries(obj || {}).forEach(([key, val]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        const fieldMeta = meta[key] || {};

        if (typeof val === 'string' || typeof val === 'number') {
            const strVal = String(val).trim();
            if (strVal.length > 0) {
                result[path] = {
                    value: strVal,
                    type: fieldMeta.type || typeof val
                };
            }
        } else if (Array.isArray(val)) {
            return; // skip arrays
        } else if (val && typeof val === 'object') {
            const nested = flattenACF(val, meta[key]?.sub_fields || {}, path);
            Object.assign(result, nested);
        }
    });

    return result;
}


registerBlockType(metadata.name, {
    apiVersion: 3,
    attributes: {
        ...metadata.attributes,
        'af-acf-field-content': {
            type: 'object'
        }
    },
    edit: ({attributes, setAttributes}) => {

        const {'af-acf-field-content': settings = {}} = attributes;
        const {field = '', tag} = settings;

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

            const restBase = postType === 'post'
                ? 'posts'
                : postType === 'page'
                    ? 'pages'
                    : postType;

            apiFetch({path: `/wp/v2/${restBase}/${postId}?context=edit`})
                .then((post) => {
                    console.log(post);
                    console.log(post?._acf);
                    if (post.acf && typeof post.acf === 'object') {
                        const flat = flattenACF(post?.acf ?? {}, post?._acf ?? {});
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
            () => Object.entries(fieldMap).map(([name, data]) => ({
                label: `${name} (${data.type})`,
                value: name
            })),
            [fieldMap]
        );

        const updateSettings = useCallback(
            (newValue) => {
                const result = {
                    ...(attributes?.['af-acf-field-content'] ?? {}),
                    ...newValue,
                };
                setAttributes({'af-acf-field-content': result});
            },
            [attributes, setAttributes]
        );

        const isDateField = ['date_picker', 'date_time_picker'].includes(settings?.type);

        const blockProps = useBlockProps({
            className: classNames(attributes)
        });

        const ElementTagName = ElementTag(settings);

        let output = fieldMap[field]?.value ?? 'ACF Content';

        console.log(fieldMap);

        if (isDateField && settings.dateFormat) {
            output = dateI18n(settings.dateFormat, output);
        }

        return <>

            <InspectorControls group="advanced">
                <Grid columns={1} columnGap={15} rowGap={20} style={{paddingTop: '20px'}}>
                    <SelectControl
                        value={tag}
                        label={'HTML element'}
                        options={ELEMENT_TAG_OPTIONS}
                        onChange={(newVal) => updateSettings({tag: newVal})}
                        __next40pxDefaultSize
                        __nextHasNoMarginBottom
                    />
                </Grid>
            </InspectorControls>
            <InspectorControls group="styles">
                <PanelBody initialOpen={true}>
                    <Grid columns={1} columnGap={15} rowGap={20} style={{paddingTop: '20px'}}>
                        <ComboboxControl
                            label="Select ACF Field"
                            value={field}
                            options={options}
                            onChange={(newVal) => updateSettings({
                                field: newVal,
                                type: fieldMap[newVal]?.type || 'text'
                            })}
                            allowReset
                            __next40pxDefaultSize
                            __nextHasNoMarginBottom
                        />
                        {isDateField ? <SelectControl
                            label="Date Format"
                            value={settings?.dateFormat ?? ''}
                            options={[
                                {label: 'Select', value: ''},
                                {label: 'YYYY-MM-DD', value: 'Y-m-d'},
                                {label: 'MM/DD/YYYY', value: 'm/d/Y'},
                                {label: 'Month DD, YYYY', value: 'F j, Y'},
                                {label: 'DD.MM.YYYY', value: 'd.m.Y'},
                                {label: 'Month DD, YYYY h:mm a', value: 'F j, Y g:i a'},
                                {label: 'YYYY-MM-DD HH:mm', value: 'Y-m-d H:i'},
                            ]}
                            onChange={(newVal) => updateSettings({dateFormat: newVal})}
                            __next40pxDefaultSize
                            __nextHasNoMarginBottom
                        /> : null}
                    </Grid>
                </PanelBody>
            </InspectorControls>
            <ElementTagName {...blockProps} dangerouslySetInnerHTML={{ __html: output }} />

        </>
    },
    save: (props) => {
        const {attributes} = props;

        const {'af-acf-field-content': settings = {}} = attributes;

        const blockProps = useBlockProps.save({
            className: classNames(attributes),
        });

        const ElementTagName = ElementTag(settings);

        return <ElementTagName {...blockProps} >{'__FIELD_CONTENT__'}</ElementTagName>
    }
})
