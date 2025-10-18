// ReferencePost.js
import {useState, useMemo, useCallback} from '@wordpress/element';
import {useSelect} from '@wordpress/data';
import {
    BaseControl,
    Button,
    Popover,
    SelectControl,
    ComboboxControl,
    Spinner,
    __experimentalGrid as Grid,
} from '@wordpress/components';
import {__} from '@wordpress/i18n';
import {Icon, archive} from "@wordpress/icons";

export function ReferencePost({value, onChange}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    // Get all post types that are viewable
    const postTypes = useSelect((select) => {
        const types = select('core').getPostTypes({per_page: -1}) || [];
        console.log(types);
        return types.filter((pt) => pt.viewable && !['attachment'].includes(pt.slug));
    }, []);

    // Determine current type (fallback to "post")
    const currentType = value?.type || '';

    // Fetch posts for the selected type
    const {posts, isResolving} = useSelect(
        (select) => {
            if (!currentType) return {posts: [], isResolving: false};

            const query = {
                search,
                per_page: 20,
                order: 'asc',
                orderby: 'title',
                status: 'publish',
            };

            const results =
                select('core').getEntityRecords('postType', currentType, query) || [];
            const resolving = select('core/data').isResolving(
                'core',
                'getEntityRecords',
                ['postType', currentType, query]
            );

            return {
                posts: results,
                isResolving: resolving,
            };
        },
        [currentType, search]
    );

    const postTypeOptions = useMemo(
        () => [
            {label: __('Select', 'AF'), value: ''},
            ...postTypes.map((pt) => ({
                label: pt.labels.singular_name,
                value: pt.slug,
            })),
        ],
        [postTypes]
    );

    const postOptions = useMemo(
        () => [
            {label: __('Select', 'AF'), value: ''},
            ...posts.map((p) => ({
                label: p.title?.rendered || __('(no title)', 'AF'),
                value: String(p.id),
            })),
        ],
        [posts]
    );

    const handleTypeChange = useCallback(
        (newType) => {
            onChange({id: '', type: newType || ''});
        },
        [onChange]
    );

    const handlePostChange = useCallback(
        (postId) => {
            onChange({id: postId || '', type: currentType});
        },
        [onChange, currentType]
    );

    const handleClear = useCallback(() => {
        onChange({id: null, type: null});
        setSearch('');
    }, [onChange]);

    const selectedLabel = useMemo(() => {
        if (!value?.id) return __('Select a post…', 'AF');

        const match = posts.find((p) => p.id === value.id);
        const title = match?.title?.rendered || __('(no title)', 'AF');

        const typeObj = postTypes.find((pt) => pt.slug === value?.type);
        const typeLabel = typeObj ? typeObj.labels.singular_name : currentType;

        return `${title} (${typeLabel})`;
    }, [value, posts, postTypes, currentType]);


    return (
        <BaseControl label={__('Reference Post', 'AF')}>
            <div style={{display: 'flex', gap: '8px'}}>
                <Button
                    variant="secondary"
                    onClick={() => setIsOpen((prev) => !prev)}
                    aria-expanded={isOpen}
                    __next40pxDefaultSize
                    __nextHasNoMarginBottom
                    style={{flexGrow: 1}}
                >
                    <Icon icon={archive} style={{width: '17px', height: '17px', marginRight: '8px'}}/>
                    {[selectedLabel]}
                </Button>
                <Button
                    variant="tertiary"
                    isDestructive
                    onClick={handleClear}
                    __next40pxDefaultSize
                    __nextHasNoMarginBottom
                >
                    {__('Clear', 'AF')}
                </Button>
            </div>
            {isOpen && (
                <Popover
                    placement="bottom-start"
                    onClose={() => setIsOpen(false)}
                    focusOnMount="container"
                >
                    <Grid columns={1} rowGap={10} style={{width: '300px', maxWidth: '100%', padding: '16px'}}>
                        <SelectControl
                            label={__('Post Type', 'AF')}
                            value={currentType}
                            options={postTypeOptions}
                            onChange={handleTypeChange}
                            __next40pxDefaultSize
                            __nextHasNoMarginBottom
                        />

                        {isResolving && <Spinner/>}

                        <SelectControl
                            label={__('Select Post', 'AF')}
                            value={value?.id}
                            options={postOptions}
                            onChange={handlePostChange}
                            __next40pxDefaultSize
                            __nextHasNoMarginBottom
                        />
                    </Grid>
                </Popover>
            )}
        </BaseControl>
    );
}
