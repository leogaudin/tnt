import {
    Button,
    Card,
    Checkbox,
    CheckboxGroup,
    Flex,
    IconButton,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import ProjectInsights from './ProjectInsights';
import Loading from '../../../components/Loading';
import { useTranslation } from 'react-i18next';
import { callAPI, icons } from '../../../service';
import { computeInsights } from '../../../service/stats';

import type { InsightBox } from '../../../types';

export default function GlobalInsights({ rawInsights, id }: { rawInsights: InsightBox[]; id: string }) {
    const [projects, setProjects] = useState<string[] | null>(null);
    const [selected, setSelected] = useState<string[] | null>(null);
    const [accumulated, setAccumulated] = useState<any>(null);
    const [edit, setEdit] = useState(false);
    const { t } = useTranslation();

    /**
     * Fetches all possible project names
     */
    const getProjects = async () => {
        const response = await callAPI(
            'POST',
            'boxes/distinct/project',
            { filters: { adminId: id } }
        )
        const json = await response.json();
        return json.distinct;
    }

    const getInsights = (selection: string[]) => {
        return computeInsights(rawInsights, { grouped: false, only: selection });
    }

    /**
     * Initialization: fetches projects then corresponding insights
     */
    useEffect(() => {
        getProjects()
            .then((projects) => {
                setProjects(projects)
                setSelected(projects)

                const insights = getInsights(projects)
                setAccumulated(insights)
            })
            .catch((e) => console.error(e));
    }, [])

    /**
     * Edit mode
     */
    const Edit = () => {
        if (!projects)
            return <Loading />;

        const [loading, setLoading] = useState(false);

        /**
         * Handles the "apply" action and fetches updated insights
         */
        const handleApply = () => {
            if (!selected || !selected.length)
                return;

            setEdit(false);
            setLoading(true);
            const insights = getInsights(selected)
            setAccumulated(insights)
            setLoading(false)
        }

        return (
            <Card
                width='100%'
                direction='column'
                borderRadius={15}
                overflow='hidden'
                shadow='md'
                padding={5}
            >
                <CheckboxGroup
                    value={selected ?? undefined}
                    onChange={(value) => setSelected(value as string[])}
                >
                    <Flex
                        wrap='wrap'
                        justify='center'
                        gap={2}
                    >
                        {projects.map((project) => (
                            <Checkbox
                                colorScheme='gray'
                                key={project}
                                value={project}
                            >
                                {project}
                            </Checkbox>
                        ))}
                    </Flex>
                </CheckboxGroup>
                <Button
                    colorScheme='gray'
                    onClick={handleApply}
                    marginTop={5}
                    isLoading={loading}
                >
                    {t('apply')}
                </Button>
            </Card>
        )
    }

    if (edit) {
        return <Edit />
    }

    if (!accumulated) {
        return <Loading />;
    }

    return (
        <ProjectInsights
            menu={
                <Flex>
                    <IconButton
                        aria-label="Toggle edit"
                        variant='outline'
                        icon={edit ? <icons.close /> : <icons.edit />}
                        onClick={() => setEdit((prev) => !prev)}
                    />
                </Flex>
            }
            insights={accumulated}
            project={`${t('globalInsights')} (${selected!.join(', ')})`}
        />
    )
}
