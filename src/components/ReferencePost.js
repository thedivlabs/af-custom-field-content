import {useState, useMemo, useCallback} from '@wordpress/element';
import {useSelect} from '@wordpress/data';
import {
    SelectControl,
    ComboboxControl,
    Spinner,
    __experimentalGrid as Grid,
} from '@wordpress/components';
import {__} from '@wordpress/i18n';

export function ReferencePost({value, onChange}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    // Get all post types that are viewable
    const postTypes = useSelect((select) => {
        const types = select('core').getPostTypes({per_page: -1}) || [];
        return types.filter((pt) => pt.viewable);
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
                order: 'desc',
                orderby: 'date',
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
        () =>
            postTypes.map((pt) => ({
                label: pt.labels.singular_name,
                value: pt.slug,
            })),
        [postTypes]
    );

    const postOptions = useMemo(
        () =>
            posts.map((p) => ({
                label: p.title?.rendered || __('(no title)', 'text-domain'),
                value: p.id,
            })),
        [posts]
    );

    const handleTypeChange = useCallback(
        (newType) => {
            onChange({id: null, type: newType});
        },
        [onChange]
    );

    const handlePostChange = useCallback(
        (postId) => {
            onChange({id: postId, type: currentType});
        },
        [onChange, currentType]
    );


    return (
        <Grid columns={1} columnGap={15} rowGap={20}>
            <SelectControl
                label={__('Post Type', 'text-domain')}
                value={currentType}
                options={[
                    {label: 'Select', value: ''},
                    ...postTypeOptions]
                }
                onChange={handleTypeChange}
                __next40pxDefaultSize
                __nextHasNoMarginBottom
            />

            <ComboboxControl
                label={__('Select Post', 'text-domain')}
                value={value?.id}
                options={postOptions}
                onChange={handlePostChange}
                onFilterValueChange={setSearch}
                __next40pxDefaultSize
                __nextHasNoMarginBottom
            />
        </Grid>
    );
}
