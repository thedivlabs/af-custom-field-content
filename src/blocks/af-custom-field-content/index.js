import {
    useBlockProps,
    InspectorControls,
} from "@wordpress/block-editor";
import { registerBlockType } from "@wordpress/blocks";
import metadata from "./block.json";
import {
    __experimentalGrid as Grid,
    __experimentalNumberControl as NumberControl,
    PanelBody,
    ComboboxControl,
    SelectControl,
    ToggleControl,
    Spinner,
} from "@wordpress/components";
import { useState, useEffect, useMemo, useCallback } from "@wordpress/element";
import { useSelect } from "@wordpress/data";
import { dateI18n } from "@wordpress/date";
import apiFetch from "@wordpress/api-fetch";
import "./style.scss";
import { Link } from "Components/Link";
import { ElementTag, ElementTagControl } from "Components/ElementTag.js";

const selector = "af-acf-field-content";

const classNames = (attributes = {}) => {
    const { "af-acf-field-content": settings } = attributes;

    return [
        selector,
        !!settings?.full ? "--full" : null,
        !!settings?.lineClamp ? "--clamp" : null,
    ]
        .filter(Boolean)
        .join(" ");
};

function flattenACF(obj, prefix = "") {
    let result = {};

    Object.entries(obj || {}).forEach(([key, val]) => {
        const path = prefix ? `${prefix}.${key}` : key;

        if (typeof val === "string") {
            const trimmed = val.trim();
            if (trimmed.length > 0) {
                result[path] = trimmed;
            }
        } else if (typeof val === "number") {
            result[path] = val;
        } else if (Array.isArray(val)) {
            return; // skip arrays
        } else if (val && typeof val === "object") {
            Object.assign(result, flattenACF(val, path));
        }
    });

    return result;
}

registerBlockType(metadata.name, {
    apiVersion: 3,
    attributes: {
        ...metadata.attributes,
        "af-acf-field-content": {
            type: "object",
        },
    },
    edit: ({ attributes, setAttributes }) => {
        const { "af-acf-field-content": settings = {} } = attributes;
        const { field = "", tag, link, referencePost } = settings;

        const style =
            attributes.className?.match(/is-style-(\w+)/)?.[1] || "text";
        const isDate = style === "date";
        const isLink = !!settings?.link?.url;

        // Current editor post info
        const postId = useSelect(
            (select) => select("core/editor").getCurrentPostId(),
            []
        );
        const postType = useSelect(
            (select) => select("core/editor").getCurrentPostType(),
            []
        );

        // Fallback: use referencePost if editing a template (no postId)
        const targetPostId = referencePost?.id || postId;
        const targetPostType = referencePost?.type ?? postType;

        // Flatten ACF fields from target post
        const [fieldMap, setFieldMap] = useState({});
        const [error, setError] = useState(null);

        useEffect(() => {
            setError(null);

            if (!targetPostId || !targetPostType) {
                setFieldMap({});
                return;
            }

            const restBase =
                targetPostType === "post"
                    ? "posts"
                    : targetPostType === "page"
                        ? "pages"
                        : targetPostType;

            apiFetch({ path: `/wp/v2/${restBase}/${targetPostId}` })
                .then((post) => {
                    if (post?.acf && typeof post.acf === "object") {
                        const flat = flattenACF(post.acf);
                        setFieldMap(flat);
                    } else {
                        setFieldMap({});
                    }
                })
                .catch((err) => {
                    console.error("Error fetching ACF fields:", err);
                    setError("Unable to fetch ACF fields for this post.");
                });
        }, [targetPostId, targetPostType]);

        const fieldOptions = useMemo(
            () =>
                Object.keys(fieldMap).map((s) => ({
                    label: s,
                    value: s,
                })),
            [fieldMap]
        );

        // Reference post ComboBox
        const [search, setSearch] = useState("");

        const { posts, isResolving } = useSelect(
            (select) => {
                const query = {
                    search,
                    per_page: 20,
                    order: "desc",
                    orderby: "date",
                    status: "publish",
                };

                const postResults =
                    select("core").getEntityRecords("postType", "post", query) ||
                    [];
                const pageResults =
                    select("core").getEntityRecords("postType", "page", query) ||
                    [];

                return {
                    posts: [...postResults, ...pageResults],
                    isResolving:
                        select("core/data").isResolving("core", "getEntityRecords", [
                            "postType",
                            "post",
                            query,
                        ]) ||
                        select("core/data").isResolving("core", "getEntityRecords", [
                            "postType",
                            "page",
                            query,
                        ]),
                };
            },
            [search]
        );

        const referenceOptions = posts.map((p) => ({
            label: p.title?.rendered || `(${p.type} #${p.id})`,
            value: JSON.stringify({ id: p.id, type: p.type }), // serialize for ComboBox
        }));

        const updateSettings = useCallback(
            (newValue) => {
                const result = {
                    ...(attributes?.["af-acf-field-content"] ?? {}),
                    ...newValue,
                };
                setAttributes({ "af-acf-field-content": result });
            },
            [attributes, setAttributes]
        );

        const blockProps = useBlockProps({
            className: classNames(attributes),
            style: Object.fromEntries(
                Object.entries({
                    "--clamp": settings?.lineClamp ?? null,
                }).filter(Boolean)
            ),
        });

        const ElementTagName = ElementTag(settings);

        let content = "ACF Field Content";

        if (fieldMap[field]) {
            if (isDate) {
                content = dateI18n(
                    settings?.dateFormat ?? "m/d/Y",
                    fieldMap[field]
                );
            } else {
                content = fieldMap[field];
            }

            if (isLink) {
                const title = settings?.link?.title ?? "Learn More";
                content = `<a href="#" title="${title}">${content}</a>`;
            } else if (!!settings?.lineClamp) {
                content = `<span>${content}</span>`;
            }
        }

        return (
            <>
                <Link
                    defaultValue={link}
                    callback={(newVal) => updateSettings({ link: newVal })}
                />
                <ElementTagControl
                    value={tag}
                    callback={(newVal) => updateSettings({ tag: newVal })}
                />
                <InspectorControls group="styles">
                    <PanelBody initialOpen={true}>
                        <Grid
                            columns={1}
                            columnGap={15}
                            rowGap={20}
                            style={{ paddingTop: "20px" }}
                        >
                            <ComboboxControl
                                label="Select ACF Field"
                                value={field}
                                options={[
                                    { label: "Select", value: "" },
                                    ...fieldOptions,
                                ]}
                                onChange={(newVal) =>
                                    updateSettings({ field: newVal })
                                }
                                allowReset
                                __next40pxDefaultSize
                                __nextHasNoMarginBottom
                            />
                            <ComboboxControl
                                label="Reference Post/Page"
                                value={
                                    referencePost
                                        ? JSON.stringify(referencePost)
                                        : ""
                                }
                                options={[
                                    { label: "Select", value: "" },
                                    ...referenceOptions,
                                ]}
                                onChange={(newVal) => {
                                    const parsed =
                                        newVal && newVal !== ""
                                            ? JSON.parse(newVal)
                                            : null;
                                    updateSettings({ referencePost: parsed });
                                }}
                                onFilterValueChange={(newSearch) =>
                                    setSearch(newSearch)
                                }
                                allowReset
                                __next40pxDefaultSize
                                __nextHasNoMarginBottom
                            />
                            {isResolving && <Spinner />}
                            {isDate ? (
                                <SelectControl
                                    label="Date Format"
                                    value={settings?.dateFormat ?? ""}
                                    options={[
                                        { label: "Select", value: "" },
                                        { label: "YYYY-MM-DD", value: "Y-m-d" },
                                        { label: "MM/DD/YYYY", value: "m/d/Y" },
                                        {
                                            label: "Month DD, YYYY",
                                            value: "F j, Y",
                                        },
                                        {
                                            label: "DD.MM.YYYY",
                                            value: "d.m.Y",
                                        },
                                    ]}
                                    onChange={(newVal) =>
                                        updateSettings({ dateFormat: newVal })
                                    }
                                    __next40pxDefaultSize
                                    __nextHasNoMarginBottom
                                />
                            ) : null}
                            <Grid columns={2} columnGap={15} rowGap={20}>
                                <NumberControl
                                    label="Line Clamp"
                                    value={settings?.lineClamp ?? ""}
                                    onChange={(newVal) =>
                                        updateSettings({ lineClamp: newVal })
                                    }
                                    min={0}
                                    max={32}
                                    __next40pxDefaultSize
                                    __nextHasNoMarginBottom
                                />
                            </Grid>
                            <Grid columns={2} columnGap={15} rowGap={20}>
                                <ToggleControl
                                    label="Full Width"
                                    checked={settings?.full}
                                    onChange={(newVal) =>
                                        updateSettings({ full: newVal })
                                    }
                                />
                            </Grid>
                        </Grid>
                    </PanelBody>
                </InspectorControls>
                <ElementTagName
                    {...blockProps}
                    dangerouslySetInnerHTML={{ __html: content }}
                />
            </>
        );
    },
    save: (props) => {
        const { attributes } = props;
        const { "af-acf-field-content": settings = {} } = attributes;

        const isLink = !!settings?.link?.url;

        const blockProps = useBlockProps.save({
            className: classNames(attributes),
        });

        let content = "__FIELD_CONTENT__";

        if (isLink) {
            const title = settings?.link?.title ?? "Learn More";
            content = `<a href="#" title="${title}">${content}</a>`;
        }

        const ElementTagName = ElementTag(settings);

        return (
            <ElementTagName
                {...blockProps}
                dangerouslySetInnerHTML={{ __html: content }}
            />
        );
    },
});
