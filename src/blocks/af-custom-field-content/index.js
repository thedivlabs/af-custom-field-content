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

            apiFetch({path: `/wp/v2/${restBase}/${postId}`})
                .then((post) => {
                    if (post.acf && typeof post.acf === 'object') {
                        const flat = flattenACF(post?.acf ?? {});
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
                    ...(attributes?.['af-acf-field-content'] ?? {}),
                    ...newValue,
                };
                setAttributes({'af-acf-field-content': result});
            },
            [attributes, setAttributes]
        );

        const blockProps = useBlockProps({
            className: classNames(attributes)
        });

        const ElementTagName = ElementTag(settings);

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
                            onChange={(newVal) => updateSettings({field: newVal})}
                            allowReset
                            __next40pxDefaultSize
                            __nextHasNoMarginBottom
                        />
                        <SelectControl
                            label="Date Format"
                            value={settings?.dateFormat ?? ''}
                            options={[
                                {label: 'Select', value: ''},
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


